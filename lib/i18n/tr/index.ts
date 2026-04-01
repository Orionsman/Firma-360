import { trAuth } from './auth';
import { trBusinessTools } from './businessTools';
import { trCommon } from './common';
import { trCustomers } from './customers';
import { trDashboard } from './dashboard';
import { trPayments } from './payments';
import { trProducts } from './products';
import { trReports } from './reports';
import { trSales } from './sales';
import { trSettings } from './settings';

export const tr = {
  common: trCommon,
  dashboard: trDashboard,
  sales: trSales,
  payments: trPayments,
  settings: trSettings,
  customers: trCustomers,
  products: trProducts,
  reports: trReports,
  auth: trAuth,
  businessTools: trBusinessTools,
} as const;
