import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const QUEUE_KEY = 'offline-write-queue-v1';
const ID_MAP_KEY = 'offline-write-id-map-v1';

type QueueTable = 'customers' | 'suppliers' | 'products' | 'payments';

type QueueMutation =
  | {
      queueId: string;
      kind: 'upsert';
      mode: 'insert' | 'update';
      table: QueueTable;
      companyId: string;
      recordId: string;
      payload: Record<string, unknown>;
    }
  | {
      queueId: string;
      kind: 'delete';
      table: QueueTable;
      companyId: string;
      recordId: string;
    }
  | {
      queueId: string;
      kind: 'rpc';
      action: 'sale_upsert';
      companyId: string;
      recordId: string;
      mode: 'insert' | 'update';
      payload: {
        customerId: string;
        saleDate: string;
        totalAmount: number;
        targetSaleNumber?: string;
        saleItems: { productId: string; quantity: number; unitPrice: number }[];
      };
    }
  | {
      queueId: string;
      kind: 'rpc';
      action: 'sale_delete';
      companyId: string;
      recordId: string;
    }
  | {
      queueId: string;
      kind: 'rpc';
      action: 'supplier_purchase';
      companyId: string;
      recordId: string;
      payload: {
        supplierId: string;
        productId: string;
        quantity: number;
        unitPrice: number;
        paymentDate: string;
        paymentMethod: string;
        description?: string | null;
      };
    };

type QueueMutationInput =
  | {
      kind: 'upsert';
      mode: 'insert' | 'update';
      table: QueueTable;
      companyId: string;
      recordId: string;
      payload: Record<string, unknown>;
    }
  | {
      kind: 'delete';
      table: QueueTable;
      companyId: string;
      recordId: string;
    }
  | {
      kind: 'rpc';
      action: 'sale_upsert';
      companyId: string;
      recordId: string;
      mode: 'insert' | 'update';
      payload: {
        customerId: string;
        saleDate: string;
        totalAmount: number;
        targetSaleNumber?: string;
        saleItems: { productId: string; quantity: number; unitPrice: number }[];
      };
    }
  | {
      kind: 'rpc';
      action: 'sale_delete';
      companyId: string;
      recordId: string;
    }
  | {
      kind: 'rpc';
      action: 'supplier_purchase';
      companyId: string;
      recordId: string;
      payload: {
        supplierId: string;
        productId: string;
        quantity: number;
        unitPrice: number;
        paymentDate: string;
        paymentMethod: string;
        description?: string | null;
      };
    };

type IdMap = Record<string, string>;

const isLocalId = (value: string) => value.startsWith('local-');

const nowId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readJson = async <T,>(key: string, fallback: T) => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async (key: string, value: unknown) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const resolveRecordId = (recordId: string, idMap: IdMap) => idMap[recordId] || recordId;

const resolvePayload = (payload: Record<string, unknown>, idMap: IdMap) => {
  const nextPayload = { ...payload };

  if (typeof nextPayload.customer_id === 'string') {
    nextPayload.customer_id = resolveRecordId(nextPayload.customer_id, idMap);
  }

  if (typeof nextPayload.supplier_id === 'string') {
    nextPayload.supplier_id = resolveRecordId(nextPayload.supplier_id, idMap);
  }

  return nextPayload;
};

const resolveSaleItems = (
  saleItems: { productId: string; quantity: number; unitPrice: number }[],
  idMap: IdMap
) =>
  saleItems.map((item) => ({
    productId: resolveRecordId(item.productId, idMap),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));

const hasUnresolvedLocalId = (value: string, idMap: IdMap) =>
  isLocalId(value) && !idMap[value];

export const createLocalId = () => nowId();

export async function enqueueOfflineMutation(mutation: QueueMutationInput) {
  const queue = await readJson<QueueMutation[]>(QUEUE_KEY, []);
  const nextQueue = [...queue, { ...mutation, queueId: nowId() } as QueueMutation];
  await writeJson(QUEUE_KEY, nextQueue);
}

export async function flushOfflineMutations() {
  const queue = await readJson<QueueMutation[]>(QUEUE_KEY, []);
  if (queue.length === 0) {
    return { flushed: 0, remaining: 0 };
  }

  const idMap = await readJson<IdMap>(ID_MAP_KEY, {});
  const remaining: QueueMutation[] = [];
  let flushed = 0;

  for (const mutation of queue) {
    try {
      if (mutation.kind === 'upsert') {
        const resolvedPayload = resolvePayload(mutation.payload, idMap);

        if (mutation.mode === 'insert') {
          const { data, error } = await supabase
            .from(mutation.table)
            .insert(resolvedPayload)
            .select('id')
            .single();

          if (error) {
            throw error;
          }

          if (data?.id && isLocalId(mutation.recordId)) {
            idMap[mutation.recordId] = data.id;
          }
        } else {
          const targetId = resolveRecordId(mutation.recordId, idMap);

          if (isLocalId(targetId)) {
            remaining.push(mutation);
            continue;
          }

          const { error } = await supabase
            .from(mutation.table)
            .update(resolvedPayload)
            .eq('id', targetId)
            .eq('company_id', mutation.companyId);

          if (error) {
            throw error;
          }
        }
        flushed += 1;
      } else if (mutation.kind === 'delete') {
        const targetId = resolveRecordId(mutation.recordId, idMap);

        if (isLocalId(targetId)) {
          delete idMap[mutation.recordId];
          flushed += 1;
          continue;
        }

        const { error } = await supabase
          .from(mutation.table)
          .delete()
          .eq('id', targetId)
          .eq('company_id', mutation.companyId);

        if (error) {
          throw error;
        }
        flushed += 1;
      } else if (mutation.action === 'sale_upsert') {
        if (
          hasUnresolvedLocalId(mutation.payload.customerId, idMap) ||
          mutation.payload.saleItems.some((item) =>
            hasUnresolvedLocalId(item.productId, idMap)
          )
        ) {
          remaining.push(mutation);
          continue;
        }

        const resolvedCustomerId = resolveRecordId(
          mutation.payload.customerId,
          idMap
        );
        const resolvedSaleItems = resolveSaleItems(
          mutation.payload.saleItems,
          idMap
        );

        if (mutation.mode === 'insert') {
          const { data, error } = await supabase.rpc('create_sale_with_items', {
            target_customer_id: resolvedCustomerId,
            sale_items_payload: resolvedSaleItems,
            target_sale_number:
              mutation.payload.targetSaleNumber || `SAT-${Date.now()}`,
          });

          if (error) {
            throw error;
          }

          if (data) {
            await supabase
              .from('sales')
              .update({
                sale_date: mutation.payload.saleDate,
                total_amount: mutation.payload.totalAmount,
              })
              .eq('id', data)
              .eq('company_id', mutation.companyId);

            if (isLocalId(mutation.recordId)) {
              idMap[mutation.recordId] = data;
            }
          }
        } else {
          const targetId = resolveRecordId(mutation.recordId, idMap);
          if (isLocalId(targetId)) {
            remaining.push(mutation);
            continue;
          }

          const { error } = await supabase.rpc('update_sale_with_items', {
            target_sale_id: targetId,
            target_customer_id: resolvedCustomerId,
            sale_items_payload: resolvedSaleItems,
            target_sale_date: mutation.payload.saleDate,
          });

          if (error) {
            throw error;
          }
        }
        flushed += 1;
      } else if (mutation.action === 'sale_delete') {
        const targetId = resolveRecordId(mutation.recordId, idMap);
        if (isLocalId(targetId)) {
          delete idMap[mutation.recordId];
          flushed += 1;
          continue;
        }

        const { error } = await supabase.rpc('delete_sale_with_restock', {
          target_sale_id: targetId,
        });

        if (error) {
          throw error;
        }

        flushed += 1;
      } else if (mutation.action === 'supplier_purchase') {
        if (
          hasUnresolvedLocalId(mutation.payload.supplierId, idMap) ||
          hasUnresolvedLocalId(mutation.payload.productId, idMap)
        ) {
          remaining.push(mutation);
          continue;
        }

        const { error } = await supabase.rpc('create_supplier_purchase', {
          target_supplier_id: resolveRecordId(
            mutation.payload.supplierId,
            idMap
          ),
          target_product_id: resolveRecordId(
            mutation.payload.productId,
            idMap
          ),
          target_quantity: mutation.payload.quantity,
          target_unit_price: mutation.payload.unitPrice,
          target_payment_date: mutation.payload.paymentDate,
          target_payment_method: mutation.payload.paymentMethod,
          target_description: mutation.payload.description || null,
        });

        if (error) {
          throw error;
        }

        flushed += 1;
      } else {
        remaining.push(mutation);
      }
    } catch {
      remaining.push(mutation);
    }
  }

  await writeJson(QUEUE_KEY, remaining);
  await writeJson(ID_MAP_KEY, idMap);

  return { flushed, remaining: remaining.length };
}
