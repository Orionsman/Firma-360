/*
  # Business Management System Database Schema

  ## Overview
  Multi-tenant business management system for tracking customers, suppliers, inventory, sales, and payments.
  Each user belongs to a company and can only access their company's data.

  ## New Tables

  ### 1. companies
  - `id` (uuid, primary key) - Company unique identifier
  - `name` (text) - Company name
  - `tax_number` (text, optional) - Tax identification number
  - `address` (text, optional) - Company address
  - `phone` (text, optional) - Contact phone
  - `email` (text, optional) - Contact email
  - `owner_id` (uuid) - Reference to auth.users (company owner)
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. user_companies
  - `user_id` (uuid) - Reference to auth.users
  - `company_id` (uuid) - Reference to companies
  - `role` (text) - User role in company (owner, admin, user)
  - Primary key: (user_id, company_id)

  ### 3. customers
  - `id` (uuid, primary key) - Customer unique identifier
  - `company_id` (uuid) - Reference to companies
  - `name` (text) - Customer name
  - `email` (text, optional) - Customer email
  - `phone` (text, optional) - Customer phone
  - `address` (text, optional) - Customer address
  - `tax_number` (text, optional) - Tax number
  - `balance` (decimal, default 0) - Current balance
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. suppliers
  - `id` (uuid, primary key) - Supplier unique identifier
  - `company_id` (uuid) - Reference to companies
  - `name` (text) - Supplier name
  - `email` (text, optional) - Supplier email
  - `phone` (text, optional) - Supplier phone
  - `address` (text, optional) - Supplier address
  - `tax_number` (text, optional) - Tax number
  - `balance` (decimal, default 0) - Current balance
  - `created_at` (timestamptz) - Creation timestamp

  ### 5. products
  - `id` (uuid, primary key) - Product unique identifier
  - `company_id` (uuid) - Reference to companies
  - `name` (text) - Product name
  - `code` (text, optional) - Product code/SKU
  - `description` (text, optional) - Product description
  - `unit` (text, default 'piece') - Unit of measurement
  - `purchase_price` (decimal, default 0) - Purchase price
  - `sale_price` (decimal, default 0) - Sale price
  - `stock_quantity` (decimal, default 0) - Current stock quantity
  - `min_stock_level` (decimal, default 0) - Minimum stock alert level
  - `created_at` (timestamptz) - Creation timestamp

  ### 6. sales
  - `id` (uuid, primary key) - Sale unique identifier
  - `company_id` (uuid) - Reference to companies
  - `customer_id` (uuid) - Reference to customers
  - `sale_number` (text) - Sale document number
  - `sale_date` (date) - Sale date
  - `total_amount` (decimal, default 0) - Total sale amount
  - `paid_amount` (decimal, default 0) - Amount paid
  - `status` (text, default 'pending') - Status: pending, paid, partial
  - `notes` (text, optional) - Additional notes
  - `created_at` (timestamptz) - Creation timestamp

  ### 7. sale_items
  - `id` (uuid, primary key) - Sale item unique identifier
  - `sale_id` (uuid) - Reference to sales
  - `product_id` (uuid) - Reference to products
  - `quantity` (decimal) - Quantity sold
  - `unit_price` (decimal) - Unit price
  - `total_price` (decimal) - Total price (quantity × unit_price)

  ### 8. payments
  - `id` (uuid, primary key) - Payment unique identifier
  - `company_id` (uuid) - Reference to companies
  - `customer_id` (uuid, optional) - Reference to customers
  - `supplier_id` (uuid, optional) - Reference to suppliers
  - `sale_id` (uuid, optional) - Reference to sales
  - `amount` (decimal) - Payment amount
  - `payment_date` (date) - Payment date
  - `payment_type` (text) - Type: income, expense
  - `payment_method` (text, default 'cash') - Method: cash, bank_transfer, credit_card, check
  - `description` (text, optional) - Payment description
  - `created_at` (timestamptz) - Creation timestamp

  ### 9. stock_movements
  - `id` (uuid, primary key) - Movement unique identifier
  - `company_id` (uuid) - Reference to companies
  - `product_id` (uuid) - Reference to products
  - `movement_type` (text) - Type: in, out, adjustment
  - `quantity` (decimal) - Movement quantity
  - `movement_date` (date) - Movement date
  - `reference_id` (uuid, optional) - Reference to related document (sale_id, etc)
  - `notes` (text, optional) - Movement notes
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access data from their assigned company
  - Company owners can manage all company data
  - Regular users have read/write access to their company data
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_number text,
  address text,
  phone text,
  email text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create user_companies junction table
CREATE TABLE IF NOT EXISTS user_companies (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  role text DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  tax_number text,
  balance decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  tax_number text,
  balance decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  code text,
  description text,
  unit text DEFAULT 'adet',
  purchase_price decimal(15,2) DEFAULT 0,
  sale_price decimal(15,2) DEFAULT 0,
  stock_quantity decimal(15,2) DEFAULT 0,
  min_stock_level decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  sale_number text NOT NULL,
  sale_date date DEFAULT CURRENT_DATE,
  total_amount decimal(15,2) DEFAULT 0,
  paid_amount decimal(15,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity decimal(15,2) NOT NULL,
  unit_price decimal(15,2) NOT NULL,
  total_price decimal(15,2) NOT NULL
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  amount decimal(15,2) NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  payment_type text NOT NULL CHECK (payment_type IN ('income', 'expense')),
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'check')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity decimal(15,2) NOT NULL,
  movement_date date DEFAULT CURRENT_DATE,
  reference_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Company owners can update their companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- RLS Policies for user_companies
CREATE POLICY "Users can view their company memberships"
  ON user_companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Company owners can insert company memberships"
  ON user_companies FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update company memberships"
  ON user_companies FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can delete company memberships"
  ON user_companies FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for customers
CREATE POLICY "Users can view customers from their company"
  ON customers FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create customers in their company"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update customers in their company"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete customers in their company"
  ON customers FOR DELETE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- RLS Policies for suppliers
CREATE POLICY "Users can view suppliers from their company"
  ON suppliers FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create suppliers in their company"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update suppliers in their company"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete suppliers in their company"
  ON suppliers FOR DELETE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- RLS Policies for products
CREATE POLICY "Users can view products from their company"
  ON products FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create products in their company"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update products in their company"
  ON products FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete products in their company"
  ON products FOR DELETE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- RLS Policies for sales
CREATE POLICY "Users can view sales from their company"
  ON sales FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create sales in their company"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update sales in their company"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete sales in their company"
  ON sales FOR DELETE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- RLS Policies for sale_items
CREATE POLICY "Users can view sale items from their company sales"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    sale_id IN (
      SELECT id FROM sales 
      WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create sale items in their company sales"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales 
      WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update sale items in their company sales"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (
    sale_id IN (
      SELECT id FROM sales 
      WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales 
      WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete sale items in their company sales"
  ON sale_items FOR DELETE
  TO authenticated
  USING (
    sale_id IN (
      SELECT id FROM sales 
      WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view payments from their company"
  ON payments FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create payments in their company"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update payments in their company"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete payments in their company"
  ON payments FOR DELETE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- RLS Policies for stock_movements
CREATE POLICY "Users can view stock movements from their company"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create stock movements in their company"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update stock movements in their company"
  ON stock_movements FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete stock movements in their company"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- RPC helper for creating a company and membership without exposing direct table writes
CREATE OR REPLACE FUNCTION public.create_company_for_current_user(company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  existing_company_id uuid;
  new_company_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT uc.company_id
  INTO existing_company_id
  FROM user_companies uc
  WHERE uc.user_id = current_user_id
  LIMIT 1;

  IF existing_company_id IS NOT NULL THEN
    RETURN existing_company_id;
  END IF;

  INSERT INTO companies (name, owner_id)
  VALUES (company_name, current_user_id)
  RETURNING id INTO new_company_id;

  INSERT INTO user_companies (user_id, company_id, role)
  VALUES (current_user_id, new_company_id, 'owner');

  RETURN new_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_for_current_user(text) TO authenticated;
