# Supabase Mein Column Add Karne Ka Guide

## Step-by-Step Instructions

### Method 1: SQL Editor Se (Sabse Aasan)

1. **Supabase Dashboard Kholen**
   - Apne browser mein Supabase project dashboard kholen
   - Login karein agar required ho

2. **SQL Editor Mein Jayen**
   - Left sidebar mein **"SQL Editor"** click karein
   - Ya top navigation se **"SQL Editor"** select karein

3. **New Query Create Karen**
   - **"New query"** button click karein
   - Ya directly SQL editor mein type karein

4. **SQL Code Paste Karen**
   ```sql
   ALTER TABLE public.services 
   ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';
   ```

5. **Run Karen**
   - **"Run"** button click karein (ya `Ctrl+Enter` press karein)
   - Success message dikhega: "Success. No rows returned"

6. **Verify Karen**
   - Neeche wala query run karein verify karne ke liye:
   ```sql
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'services' AND column_name = 'treatment_options';
   ```
   - Result mein `treatment_options` column dikhna chahiye

### Method 2: Table Editor Se (Visual Method)

1. **Table Editor Mein Jayen**
   - Left sidebar se **"Table Editor"** select karein
   - **"services"** table select karein

2. **Add Column**
   - Table ke top par **"Add Column"** button click karein
   - Ya right-click karke **"Add Column"** select karein

3. **Column Details Fill Karen**
   - **Name**: `treatment_options`
   - **Type**: `jsonb` select karein
   - **Default Value**: `[]` (empty array)
   - **Nullable**: Checked (optional)

4. **Save Karen**
   - **"Save"** button click karein

### Method 3: Complete SQL (With Comment)

Agar aap detailed SQL chahiye with comment:

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

## Verification Query

Column add hone ke baad verify karein:

```sql
-- Check if column exists
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'services' 
  AND column_name = 'treatment_options';
```

Expected Result:
```
column_name        | data_type | column_default | is_nullable
-------------------+-----------+----------------+-------------
treatment_options  | jsonb     | '[]'::jsonb    | YES
```

## Troubleshooting

### Agar Error Aaye:

1. **"Column already exists"**
   - Matlab column pehle se hai
   - Koi action ki zarurat nahi

2. **"Permission denied"**
   - Admin rights check karein
   - Ya project owner se contact karein

3. **"Table does not exist"**
   - Table name check karein: `services` (not `service`)
   - Schema check karein: `public.services`

## After Adding Column

Column add hone ke baad:
- ✅ Admin panel se treatment subcategories add kar sakte hain
- ✅ Website par subcategories display hongi
- ✅ Booking flow mein pricing options select kar sakte hain
