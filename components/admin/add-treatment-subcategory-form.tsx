"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Plus, X } from "lucide-react"
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

interface AddTreatmentSubcategoryFormProps {
  services: ServiceWithCategory[]
}

export default function AddTreatmentSubcategoryForm({ services }: AddTreatmentSubcategoryFormProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("")
  const [treatmentSubcategories, setTreatmentSubcategories] = useState<TreatmentSubcategory[]>([{
    name: "",
    image: "",
    pricing: [{ name: "", price: 0 }]
  }])
  const [subcatImageFiles, setSubcatImageFiles] = useState<{ [key: number]: File | null }>({})
  const [subcatUploading, setSubcatUploading] = useState<{ [key: number]: boolean }>({})
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

  const handleAddSubcategory = () => {
    setTreatmentSubcategories([...treatmentSubcategories, {
      name: "",
      image: "",
      pricing: [{ name: "", price: 0 }]
    }])
  }

  const handleRemoveSubcategory = (index: number) => {
    setTreatmentSubcategories(treatmentSubcategories.filter((_, i) => i !== index))
  }

  const handleAddPricingOption = (subcatIndex: number) => {
    const updated = [...treatmentSubcategories]
    updated[subcatIndex].pricing.push({ name: "", price: 0 })
    setTreatmentSubcategories(updated)
  }

  const handleRemovePricingOption = (subcatIndex: number, priceIndex: number) => {
    const updated = [...treatmentSubcategories]
    updated[subcatIndex].pricing = updated[subcatIndex].pricing.filter((_, i) => i !== priceIndex)
    setTreatmentSubcategories(updated)
  }

  const handleSave = async () => {
    if (!selectedServiceId) {
      toast({ 
        title: "Service Required", 
        description: "Please select a service first",
        variant: "destructive" 
      })
      return
    }

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

    if (validSubcategories.length === 0) {
      toast({ 
        title: "No Valid Subcategories", 
        description: "Please add at least one valid subcategory",
        variant: "destructive" 
      })
      return
    }

    // Get existing subcategories for the service
    const selectedService = services.find(s => s.id === selectedServiceId)
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

    const existingSubcategories = parseTreatmentSubcategories((selectedService as any)?.treatment_options)
    const allSubcategories = [...existingSubcategories, ...validSubcategories]

    startTransition(async () => {
      try {
        const res = await fetch(`/api/services/${selectedServiceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            treatment_options: JSON.stringify(allSubcategories),
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Unknown error")
        }
        toast({ title: "Treatment subcategories added successfully!" })
        // Reset form
        setSelectedServiceId("")
        setTreatmentSubcategories([{
          name: "",
          image: "",
          pricing: [{ name: "", price: 0 }]
        }])
        setShowForm(false)
        // Refresh page to show updated data
        window.location.reload()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        toast({ title: "Error adding subcategories", description: errorMessage, variant: "destructive" })
      }
    })
  }

  if (!showForm) {
    return (
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Add New Treatment Subcategories</h2>
            <p className="text-sm text-muted-foreground">
              Add subcategories with pricing options to any service
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Add New Treatment Subcategories</h2>
        <Button variant="ghost" size="sm" onClick={() => {
          setShowForm(false)
          setSelectedServiceId("")
          setTreatmentSubcategories([{
            name: "",
            image: "",
            pricing: [{ name: "", price: 0 }]
          }])
        }}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Service Selector */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-foreground">Select Service *</label>
        <select 
          value={selectedServiceId} 
          onChange={(e) => setSelectedServiceId(e.target.value)} 
          className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          required
        >
          <option value="">Select a service</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} {service.category?.name ? `(${service.category.name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategories Form */}
      <div className="space-y-4">
        {treatmentSubcategories.map((subcat, subcatIndex) => (
          <div key={subcatIndex} className="border rounded-lg p-4 bg-muted/50">
            <div className="space-y-4">
              {/* Subcategory Name and Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-foreground">Subcategory Name *</label>
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
                        const fileName = `subcategory-${selectedServiceId || 'new'}-${subcatIndex}-${Date.now()}.${fileExt}`
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
                    onClick={() => handleAddPricingOption(subcatIndex)}
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
                        onClick={() => handleRemovePricingOption(subcatIndex, priceIndex)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {subcat.pricing.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No pricing options. Click &quot;+ Add Price Option&quot; to add.
                    </p>
                  )}
                </div>
              </div>
              
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveSubcategory(subcatIndex)}
              >
                Remove Subcategory
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddSubcategory}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Subcategory
        </Button>
        <Button 
          type="button" 
          onClick={handleSave} 
          disabled={isPending}
          className="ml-auto"
        >
          {isPending ? "Saving..." : "Save Subcategories"}
        </Button>
      </div>
    </Card>
  )
}
