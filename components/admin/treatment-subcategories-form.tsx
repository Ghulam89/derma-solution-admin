"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { ServiceWithCategory } from "@/types"

interface PricingOption {
  name: string
  price: number
}

interface TreatmentSubcategory {
  name: string
  image?: string
  pricing: PricingOption[]
}

interface TreatmentSubcategoriesFormProps {
  service: ServiceWithCategory
  onSaved: () => void
}

export default function TreatmentSubcategoriesForm({ service, onSaved }: TreatmentSubcategoriesFormProps) {
  const parseTreatmentSubcategories = (v: any): TreatmentSubcategory[] => {
    if (!v) return []
    try {
      const parsed = typeof v === 'string' ? JSON.parse(v) : v
      if (!Array.isArray(parsed)) return []
      return parsed.map((item: any) => {
        if (item.title && item.price && !item.pricing) {
          return {
            name: item.title,
            image: item.image || "",
            pricing: [{ name: "Standard", price: item.price }]
          }
        }
        return {
          name: item.name || item.title || "",
          image: item.image || "",
          pricing: Array.isArray(item.pricing) ? item.pricing : []
        }
      })
    } catch { return [] }
  }

  const [treatmentSubcategories, setTreatmentSubcategories] = useState<TreatmentSubcategory[]>(
    parseTreatmentSubcategories((service as any)?.treatment_options)
  )
  const [subcatImageFiles, setSubcatImageFiles] = useState<{ [key: number]: File | null }>({})
  const [subcatUploading, setSubcatUploading] = useState<{ [key: number]: boolean }>({})
  const [isPending, startTransition] = useTransition()

  const handleSave = async () => {
    // Validate subcategories
    const invalidSubcats = treatmentSubcategories.filter(
      subcat => !subcat.name.trim() || !subcat.pricing || subcat.pricing.length === 0 || 
      subcat.pricing.some(p => !p.name.trim() || p.price <= 0)
    )
    if (invalidSubcats.length > 0) {
      toast({ 
        title: "Invalid Subcategories", 
        description: "All subcategories must have a name and at least one pricing option with name and price > 0",
        variant: "destructive" 
      })
      return
    }

    // Filter valid subcategories
    const validSubcategories = treatmentSubcategories.filter(
      subcat => subcat.name.trim() && subcat.pricing && subcat.pricing.length > 0 &&
      subcat.pricing.every(p => p.name.trim() && p.price > 0)
    )

    startTransition(async () => {
      try {
        const res = await fetch(`/api/services/${service.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            treatment_options: validSubcategories.length > 0 ? JSON.stringify(validSubcategories) : null,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Unknown error")
        }
        toast({ title: "Treatment subcategories updated!" })
        onSaved()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        toast({ title: "Error updating subcategories", description: errorMessage, variant: "destructive" })
      }
    })
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Manage Subcategories for: {service.name}</h3>
        <p className="text-sm text-muted-foreground">
          Add, edit, or remove treatment subcategories with their pricing options
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {treatmentSubcategories.map((subcat, subcatIndex) => (
          <div key={subcatIndex} className="border rounded-lg p-4 bg-muted/50">
            <div className="space-y-4">
              {/* Subcategory Name and Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-foreground">Name *</label>
                  <Input
                    value={subcat.name}
                    onChange={(e) => {
                      const updated = [...treatmentSubcategories]
                      updated[subcatIndex].name = e.target.value
                      setTreatmentSubcategories(updated)
                    }}
                    placeholder="e.g., Full Face, Upper Lip, Chin"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-foreground">Image</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null
                      if (!file) return
                      
                      setSubcatUploading(prev => ({ ...prev, [subcatIndex]: true }))
                      try {
                        const supabase = createClient()
                        const fileExt = file.name.split('.').pop()
                        const fileName = `subcategory-${service.id}-${subcatIndex}-${Date.now()}.${fileExt}`
                        const { error } = await supabase.storage.from('service-images').upload(fileName, file)
                        if (error) throw error
                        const { data: urlData } = supabase.storage.from('service-images').getPublicUrl(fileName)
                        
                        const updated = [...treatmentSubcategories]
                        updated[subcatIndex].image = urlData.publicUrl
                        setTreatmentSubcategories(updated)
                        setSubcatImageFiles(prev => ({ ...prev, [subcatIndex]: null }))
                      } catch (err) {
                        toast({ 
                          title: "Image upload failed", 
                          description: err instanceof Error ? err.message : "Unknown error",
                          variant: "destructive" 
                        })
                      } finally {
                        setSubcatUploading(prev => ({ ...prev, [subcatIndex]: false }))
                      }
                    }}
                    className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {subcatUploading[subcatIndex] && <span className="text-xs text-muted-foreground">Uploading...</span>}
                  {subcat.image && !subcatUploading[subcatIndex] && (
                    <div className="mt-2">
                      <Image src={subcat.image} alt="Subcategory" width={60} height={60} className="object-cover rounded" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Pricing Array */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground">Pricing Options *</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = [...treatmentSubcategories]
                      updated[subcatIndex].pricing.push({ name: "", price: 0 })
                      setTreatmentSubcategories(updated)
                    }}
                  >
                    + Add Price Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {subcat.pricing.map((priceOption, priceIndex) => (
                    <div key={priceIndex} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block mb-1 text-xs text-muted-foreground">Price Name</label>
                        <Input
                          value={priceOption.name}
                          onChange={(e) => {
                            const updated = [...treatmentSubcategories]
                            updated[subcatIndex].pricing[priceIndex].name = e.target.value
                            setTreatmentSubcategories(updated)
                          }}
                          placeholder="e.g., Small Area, Medium Area, Large Area"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-1 text-xs text-muted-foreground">Price</label>
                        <Input
                          type="number"
                          value={priceOption.price || ""}
                          onChange={(e) => {
                            const updated = [...treatmentSubcategories]
                            updated[subcatIndex].pricing[priceIndex].price = Number(e.target.value) || 0
                            setTreatmentSubcategories(updated)
                          }}
                          placeholder="0.00"
                          min={0}
                          step="0.01"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = [...treatmentSubcategories]
                          updated[subcatIndex].pricing = updated[subcatIndex].pricing.filter((_, i) => i !== priceIndex)
                          setTreatmentSubcategories(updated)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {subcat.pricing.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No pricing options. Click "+ Add Price Option" to add.
                    </p>
                  )}
                </div>
              </div>
              
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setTreatmentSubcategories(treatmentSubcategories.filter((_, i) => i !== subcatIndex))
                }}
              >
                Remove Subcategory
              </Button>
            </div>
          </div>
        ))}
        {treatmentSubcategories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No subcategories added. Click "Add Subcategory" to create treatment options.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setTreatmentSubcategories([...treatmentSubcategories, {
              name: "",
              image: "",
              pricing: [{ name: "", price: 0 }]
            }])
          }}
        >
          + Add Subcategory
        </Button>
        <Button 
          type="button" 
          onClick={handleSave} 
          disabled={isPending}
          className="ml-auto"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </Card>
  )
}
