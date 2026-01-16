import { createClient } from "@/lib/supabase/server"
import { getServices } from "@/lib/supabase/queries"
import TreatmentSubcategoriesTable from "@/components/admin/treatment-subcategories-table"
import AddTreatmentSubcategoryForm from "@/components/admin/add-treatment-subcategory-form"

export default async function TreatmentSubcategoriesPage() {
  const supabase = await createClient()
  
  // Verify admin access
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Unauthorized</div>
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return <div>Unauthorized</div>
  }

  // Fetch all services with their treatment_options
  const services = await getServices()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Treatment Subcategories</h1>
        <p className="text-muted-foreground mt-2">
          View and manage treatment subcategories for all services
        </p>
      </div>

      <AddTreatmentSubcategoryForm services={services} />

      <TreatmentSubcategoriesTable services={services} />
    </div>
  )
}
