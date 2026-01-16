"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Edit } from "lucide-react"
import Link from "next/link"
import TreatmentSubcategoriesForm from "./treatment-subcategories-form"
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

interface TreatmentSubcategoriesTableProps {
  services: ServiceWithCategory[]
}

export default function TreatmentSubcategoriesTable({ services }: TreatmentSubcategoriesTableProps) {
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set())
  const [editingService, setEditingService] = useState<string | null>(null)

  const parseTreatmentSubcategories = (v: any): TreatmentSubcategory[] => {
    if (!v) return []
    try {
      const parsed = typeof v === 'string' ? JSON.parse(v) : v
      if (!Array.isArray(parsed)) return []
      return parsed.map((item: any) => {
        if (item.title && item.price && !item.pricing) {
          // Old format - migrate to new format
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

  const toggleService = (serviceId: string) => {
    const newExpanded = new Set(expandedServices)
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId)
    } else {
      newExpanded.add(serviceId)
    }
    setExpandedServices(newExpanded)
  }

  const handleSaved = () => {
    setEditingService(null)
    // Refresh to show updated data
    window.location.reload()
  }

  // Show all services, not just those with subcategories
  const allServices = services

  return (
    <div className="space-y-4">
      {allServices.map((service: any) => {
        const subcategories = parseTreatmentSubcategories(service.treatment_options)
        const isExpanded = expandedServices.has(service.id)
        const isEditing = editingService === service.id

        return (
          <div key={service.id} className="border rounded-lg overflow-hidden">
            {/* Service Header */}
            <div
              className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
              onClick={() => {
                if (!isEditing) toggleService(service.id)
              }}
            >
              <div className="flex items-center gap-4 flex-1">
                {service.thumbnail && (
                  <Image
                    src={service.thumbnail}
                    alt={service.name}
                    width={48}
                    height={48}
                    className="rounded object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold text-lg">{service.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {service.category?.name || "No category"} • {subcategories.length} subcategor{subcategories.length !== 1 ? 'ies' : 'y'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isEditing) {
                      setEditingService(null)
                    } else {
                      setEditingService(service.id)
                      if (!isExpanded) toggleService(service.id)
                    }
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditing ? "View" : "Edit"}
                </Button>
                {!isEditing && (
                  isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )
                )}
              </div>
            </div>

            {/* Edit Form or View Table */}
            {isExpanded && (
              <div className="p-4 bg-white border-t">
                {isEditing ? (
                  <TreatmentSubcategoriesForm 
                    service={service} 
                    onSaved={handleSaved}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    {subcategories.length > 0 ? (
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-800">Subcategory Name</th>
                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-800">Image</th>
                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-800">Pricing Options</th>
                            <th className="text-right px-4 py-3 text-sm font-semibold text-gray-800">Total Prices</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subcategories.map((subcat, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50 transition">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {subcat.name}
                              </td>
                              <td className="px-4 py-3">
                                {subcat.image ? (
                                  <Image
                                    src={subcat.image}
                                    alt={subcat.name}
                                    width={60}
                                    height={60}
                                    className="rounded object-cover"
                                  />
                                ) : (
                                  <span className="text-muted-foreground text-sm">No image</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  {subcat.pricing.length > 0 ? (
                                    subcat.pricing.map((price, priceIndex) => (
                                      <div key={priceIndex} className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {price.name}
                                        </Badge>
                                        <span className="text-sm font-semibold text-cyan-600">
                                          £{price.price.toFixed(2)}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No pricing options</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-bold text-gray-900">
                                  {subcat.pricing.length} option{subcat.pricing.length !== 1 ? 's' : ''}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No subcategories added yet. Click "Edit" to add subcategories.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
