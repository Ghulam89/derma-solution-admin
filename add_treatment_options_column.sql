-- Add treatment_options column to services table
-- This column stores an array of treatment subcategories with name, image, and pricing array

ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';

-- Add comment to explain the structure
COMMENT ON COLUMN public.services.treatment_options IS 'Array of treatment subcategories. Each item has {name: string, image?: string, pricing: [{name: string, price: number}]}. Example: [{"name": "Full Face", "image": "url", "pricing": [{"name": "Small Area", "price": 100}, {"name": "Large Area", "price": 200}]}]';
