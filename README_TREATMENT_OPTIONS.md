# Treatment Options Column Migration

## Problem
The `treatment_options` column is missing from the `services` table in your database schema.

## Solution
Run the migration SQL to add the column.

## Steps to Add the Column

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the following SQL:

```sql
-- Add treatment_options column to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';

-- Add comment to explain the structure
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
}';
```

4. Click **Run** to execute the SQL

### Option 2: Using the Migration File

1. Open `migrate_add_treatment_options.sql` file
2. Copy the SQL content
3. Run it in your Supabase SQL Editor

## Verify the Column Was Added

Run this query to verify:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'services' AND column_name = 'treatment_options';
```

You should see:
- `column_name`: treatment_options
- `data_type`: jsonb
- `column_default`: '[]'::jsonb

## Data Structure

The `treatment_options` column stores an array of objects with this structure:

```json
[
  {
    "name": "Full Face",
    "image": "https://example.com/image.jpg",
    "pricing": [
      {"name": "Small Area", "price": 100},
      {"name": "Medium Area", "price": 150},
      {"name": "Large Area", "price": 200}
    ]
  },
  {
    "name": "Upper Lip",
    "image": "",
    "pricing": [
      {"name": "Standard", "price": 50}
    ]
  }
]
```

## After Migration

Once the column is added:
1. The admin panel will allow you to add treatment subcategories
2. Each subcategory can have:
   - Name
   - Image (optional)
   - Multiple pricing options
3. The booking page will display subcategories with pricing options
