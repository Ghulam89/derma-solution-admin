import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("services").select("*")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()
<<<<<<< HEAD
  
  // Ensure treatment_options is properly formatted as JSONB
  if (body.treatment_options && typeof body.treatment_options === 'string') {
    try {
      body.treatment_options = JSON.parse(body.treatment_options)
    } catch {
      // If parsing fails, set to empty array
      body.treatment_options = []
    }
  }
  
=======
>>>>>>> 2f9c51c3c2d6dfe2ad80bd0f2fa3476774082d3c
  const { data, error } = await supabase.from("services").insert([body]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
