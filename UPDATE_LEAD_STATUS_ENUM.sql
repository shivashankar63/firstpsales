-- Update leads table to use professional status terminology
-- Change status enum from ('new', 'qualified', 'negotiation', 'won', 'lost') 
-- to ('new', 'qualified', 'proposal', 'closed_won', 'not_interested')

-- First, alter the enum type
ALTER TYPE lead_status RENAME TO lead_status_old;

CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'proposal', 'closed_won', 'not_interested');

-- Update the column to use the new enum
ALTER TABLE leads ALTER COLUMN status TYPE lead_status USING (
  CASE 
    WHEN status::text = 'negotiation' THEN 'proposal'::lead_status
    WHEN status::text = 'won' THEN 'closed_won'::lead_status
    WHEN status::text = 'lost' THEN 'not_interested'::lead_status
    ELSE status::text::lead_status
  END
);

-- Drop the old enum
DROP TYPE lead_status_old;

-- Verify the changes
SELECT DISTINCT status FROM leads;
