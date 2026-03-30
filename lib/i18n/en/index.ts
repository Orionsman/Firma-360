import type { TranslationSchema } from '../tr';
import { enAuth } from './auth';
import { enCommon } from './common';
import { enCustomers } from './customers';
import { enDashboard } from './dashboard';
import { enPayments } from './payments';
import { enProducts } from './products';
import { enReports } from './reports';
import { enSales } from './sales';
import { enSettings } from './settings';

export const en: TranslationSchema = {
  common: enCommon,
  dashboard: enDashboard,
  sales: enSales,
  payments: enPayments,
  settings: enSettings,
  customers: enCustomers,
  products: enProducts,
  reports: enReports,
  auth: enAuth,
};
