-- Migration: Add treatment_options column to services table
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add the column if it doesn't exist
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';

-- Step 2: Add comment to explain the structure
COMMENT ON COLUMN public.services.treatment_options IS 
'Array of treatment subcategories. 
Each item structure: {
  "name": string (required),
  "image": string (optional URL),
  "pricing": [
    {
      "name": string (required),
      "price": number (required, > 0)
    }
  ]
}
Example: [
  {
    "name": "Full Face",
    "image": "https://example.com/image.jpg",
    "pricing": [
      {"name": "Small Area", "price": 100},
      {"name": "Medium Area", "price": 150},
      {"name": "Large Area", "price": 200}
    ]
  }
]';

-- Step 3: Verify the column was added
-- You can run this query to check:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'services' AND column_name = 'treatment_options';
