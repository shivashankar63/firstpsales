-- ============================================================================
-- ADD SALES & PURCHASE MANAGEMENT TABLES
-- ============================================================================
-- This script adds tables for Deal Stages, Won/Lost Deals, Sales (Quotations, Invoices, Receipts)
-- and Purchases (Suppliers, Supplier Persons, Purchase Orders)
-- Run this SQL in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. DEAL STAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6B7280',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, created_by)
);

-- ============================================================================
-- 2. QUOTATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  tax_amount NUMERIC(15, 2) DEFAULT 0,
  discount NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  notes TEXT,
  terms_conditions TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. QUOTATION ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  tax_amount NUMERIC(15, 2) DEFAULT 0,
  discount NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  terms_conditions TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. INVOICE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. RECEIPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'check', 'other')),
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  reference_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zip TEXT,
  tax_id TEXT,
  website TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. SUPPLIER PERSONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.supplier_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  designation TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. PURCHASE ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  tax_amount NUMERIC(15, 2) DEFAULT 0,
  discount NUMERIC(15, 2) DEFAULT 0,
  shipping_cost NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
  notes TEXT,
  terms_conditions TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. PURCHASE ORDER ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_deal_stages_created_by ON public.deal_stages(created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON public.quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON public.quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON public.quotations(created_by);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_lead_id ON public.invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON public.receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON public.receipts(created_by);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON public.suppliers(created_by);
CREATE INDEX IF NOT EXISTS idx_supplier_persons_supplier_id ON public.supplier_persons(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON public.purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Deal Stages RLS
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deal stages visible to creator and managers"
  ON public.deal_stages FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
CREATE POLICY "Users can create deal stages"
  ON public.deal_stages FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update their deal stages"
  ON public.deal_stages FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Quotations RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quotations visible to creator and managers"
  ON public.quotations FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
CREATE POLICY "Users can create quotations"
  ON public.quotations FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update quotations"
  ON public.quotations FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Quotation Items RLS
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quotation items visible to quotation creator"
  ON public.quotation_items FOR SELECT
  USING (
    quotation_id IN (SELECT id FROM public.quotations WHERE created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Invoices RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoices visible to creator and managers"
  ON public.invoices FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
CREATE POLICY "Users can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update invoices"
  ON public.invoices FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Invoice Items RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoice items visible to invoice creator"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (SELECT id FROM public.invoices WHERE created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Receipts RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Receipts visible to creator and managers"
  ON public.receipts FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
CREATE POLICY "Users can create receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update receipts"
  ON public.receipts FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Suppliers RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers visible to creator and managers"
  ON public.suppliers FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
CREATE POLICY "Users can create suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update suppliers"
  ON public.suppliers FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Supplier Persons RLS
ALTER TABLE public.supplier_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Supplier persons visible to supplier creator"
  ON public.supplier_persons FOR SELECT
  USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Purchase Orders RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchase orders visible to creator and managers"
  ON public.purchase_orders FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );
CREATE POLICY "Users can create purchase orders"
  ON public.purchase_orders FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update purchase orders"
  ON public.purchase_orders FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager')));

-- Purchase Order Items RLS
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchase order items visible to PO creator"
  ON public.purchase_order_items FOR SELECT
  USING (
    purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- ============================================================================
-- 13. FUNCTION FOR UPDATED_AT TRIGGER
-- ============================================================================
-- Create the function if it doesn't exist (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 14. TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS update_deal_stages_updated_at ON public.deal_stages;
DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
DROP TRIGGER IF EXISTS update_receipts_updated_at ON public.receipts;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
DROP TRIGGER IF EXISTS update_supplier_persons_updated_at ON public.supplier_persons;
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.purchase_orders;

-- Create triggers
CREATE TRIGGER update_deal_stages_updated_at BEFORE UPDATE ON public.deal_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supplier_persons_updated_at BEFORE UPDATE ON public.supplier_persons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 15. VERIFY SETUP
-- ============================================================================
SELECT 'Sales and Purchase tables setup complete!' as status;
