-- Migration: Remove "Virtual" prefix from all product names
-- Run this in Supabase SQL Editor to update product names

UPDATE products
SET name = LTRIM(REPLACE(name, 'Virtual ', ''))
WHERE name LIKE 'Virtual %';
