/*
  # Add Stock Management Functions

  ## Description
  Creates helper functions for managing stock levels:
  1. decrement_stock - Decreases product stock when items are sold
  2. increment_stock - Increases product stock for new purchases

  These functions help maintain data consistency and simplify stock operations.
*/

CREATE OR REPLACE FUNCTION decrement_stock(
  product_id uuid,
  qty decimal
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - qty
  WHERE id = product_id AND stock_quantity >= qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', product_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_stock(
  product_id uuid,
  qty decimal
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity + qty
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;
