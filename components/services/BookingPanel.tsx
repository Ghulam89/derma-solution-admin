"use client"
import React, { useState, useEffect } from "react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import ServiceDateSelector from "@/components/services/ServiceDateSelector"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Service, Order, Doctor } from "@/types"

export default function BookingPanel({ service, rescheduleOrder }: { service: Service, rescheduleOrder?: Order | null }) {
  const router = useRouter()
  const { toast } = useToast();
  
  // Parse session_options from service to determine max sessions
  const parseSessionOptions = (raw: unknown): string[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (Array.isArray(parsed.options)) return parsed.options
      }
    } catch {}
    return []
  }
  
  // Extract maximum session count from session_options
  const getMaxSessions = (): number => {
    const sessionOptions = parseSessionOptions(service?.session_options)
    if (sessionOptions.length === 0) return 10 // Default to 10 if no options
    
    let maxSession = 1
    sessionOptions.forEach((opt: string) => {
      const match = String(opt).match(/(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxSession) maxSession = num
      }
    })
    return Math.max(1, Math.min(10, maxSession)) // Clamp between 1 and 10
  }
  
  const maxSessions = getMaxSessions()
  // Generate sessions 1 to maxSessions
  const servicePackages: string[] = Array.from({ length: maxSessions }, (_, i) => {
    const count = i + 1;
    return `${count} ${count === 1 ? 'session' : 'sessions'}`;
  });
  const [selectedPackage, setSelectedPackage] = useState<string>(rescheduleOrder?.session_count ? `${rescheduleOrder.session_count} session${rescheduleOrder.session_count > 1 ? 's' : ''}` : "1 session")
  const [selectedDate, setSelectedDate] = useState<string | null>(rescheduleOrder?.booking_date || null)
  const [selectedTime, setSelectedTime] = useState<string | null>(rescheduleOrder?.booking_time || null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(rescheduleOrder?.doctor_id || "")
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastApiResponse, setLastApiResponse] = useState<unknown>(null)

  // receive selection updates from ServiceDateSelector
  useEffect(() => {
    // ensure selectedPackage is valid when servicePackages change
    if (!servicePackages.includes(selectedPackage)) {
      const t = setTimeout(() => setSelectedPackage("1 session"), 0)
      return () => clearTimeout(t)
    }
    return
  }, [servicePackages, selectedPackage])

  // Load doctors on mount
  useEffect(() => {
    const loadDoctors = async () => {
      setLoadingDoctors(true)
      try {
        const res = await fetch("/api/doctors")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setDoctors(data.filter((d: Doctor) => d.is_active))
          }
        }
      } catch (error) {
        console.error("Failed to load doctors:", error)
      } finally {
        setLoadingDoctors(false)
      }
    }
    loadDoctors()
  }, [])

  // restore selections from pendingBooking if user is returning from confirm page (only if not rescheduling)
  useEffect(() => {
    if (rescheduleOrder) return;
    try {
      const raw = localStorage.getItem('pendingBooking')
      if (!raw) return
      const pending = JSON.parse(raw)
      if (pending?.service_id === service?.id) {
        const timers: number[] = []
        if (pending.package && servicePackages.includes(pending.package) && !userInteracted) {
          timers.push(window.setTimeout(() => setSelectedPackage(pending.package), 0))
        }
        if (pending.date) timers.push(window.setTimeout(() => setSelectedDate(pending.date), 0))
        if (pending.time) timers.push(window.setTimeout(() => setSelectedTime(pending.time), 0))
        if (pending.doctor_id) timers.push(window.setTimeout(() => setSelectedDoctorId(pending.doctor_id), 0))
        return () => timers.forEach(t => clearTimeout(t))
      }
    } catch {
      // ignore parse errors
    }
    return
  }, [service?.id, servicePackages, userInteracted, rescheduleOrder])

  const basePrice = Number(service?.base_price ?? 0)
  
  // Parse treatment subcategories if available
  interface PricingOption {
    name: string
    price: number
  }
  
  interface TreatmentSubcategory {
    name: string
    image?: string
    pricing: PricingOption[]
  }
  
  const parseTreatmentSubcategories = (v: unknown): TreatmentSubcategory[] => {
    if (!v) return []
    try {
      const parsed = typeof v === 'string' ? JSON.parse(v) : v
      if (!Array.isArray(parsed)) return []
      // Migrate old format to new format
      return parsed.map((item: unknown) => {
        const typedItem = item as Record<string, unknown>
        if (typedItem.title && typedItem.price && !typedItem.pricing) {
          return {
            name: String(typedItem.title),
            image: String(typedItem.image || ""),
            pricing: [{ name: "Standard", price: Number(typedItem.price) }]
          }
        }
        return {
          name: String(typedItem.name || typedItem.title || ""),
          image: String(typedItem.image || ""),
          pricing: Array.isArray(typedItem.pricing) ? typedItem.pricing as PricingOption[] : []
        }
      })
    } catch { return [] }
  }
  
  const treatmentSubcategories = parseTreatmentSubcategories((service as Service & { treatment_options?: unknown })?.treatment_options)
  const hasTreatmentSubcategories = treatmentSubcategories.length > 0
  
  // State for selected treatment subcategories and pricing options
  // Format: { subcategoryName: selectedPricingOption }
  const [selectedSubcategories, setSelectedSubcategories] = useState<{ [key: string]: PricingOption | null }>({})
  
  // State for expanded subcategories (to show pricing options)
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set())
  
  const toggleSubcategoryExpanded = (subcatName: string) => {
    setExpandedSubcategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subcatName)) {
        newSet.delete(subcatName)
      } else {
        newSet.add(subcatName)
      }
      return newSet
    })
  }
  
  const toggleSubcategoryPricing = (subcatName: string, pricingOption: PricingOption) => {
    setSelectedSubcategories(prev => {
      const current = prev[subcatName]
      if (current && current.name === pricingOption.name && current.price === pricingOption.price) {
        // Deselect if same option clicked
        const updated = { ...prev }
        delete updated[subcatName]
        return updated
      }
      // Select new option
      return { ...prev, [subcatName]: pricingOption }
    })
  }
  
  // Calculate total from selected subcategories
  const calculateSubcategoryTotal = () => {
    let total = 0
    Object.values(selectedSubcategories).forEach(pricingOption => {
      if (pricingOption) {
        total += pricingOption.price
      }
    })
    return total
  }
  
  const getSessionCount = (label: string) => {
    const m = String(label).match(/(\d+)/)
    return m ? parseInt(m[0], 10) : 1
  }
  const getDiscount = (label: string) => {
    const n = getSessionCount(label)
    switch (n) {
      case 3:
        return 0.25
      case 6:
        return 0.35
      case 10:
        return 0.45
      default:
        return 0
    }
  }
  const formatPrice = (v: number) => `£${v.toFixed(2)}`

  const handleBook = async () => {
    if (hasTreatmentSubcategories && Object.keys(selectedSubcategories).length === 0) {
      toast({
        title: "Treatment Selection Required",
        description: "Please select at least one treatment subcategory and pricing option",
        variant: "destructive",
      })
      return
    }
    if (!selectedDoctorId) {
      toast({
        title: "Doctor Selection Required",
        description: "Please select a doctor before booking",
        variant: "destructive",
      })
      return
    }
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Date and Time Required",
        description: "Please select a date and time before booking",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    // Prepare booking payload early so we can persist it for unauthenticated users
    const booking = {
      service_id: service.id,
      service_name: service.name,
      package: hasTreatmentSubcategories 
        ? Object.keys(selectedSubcategories).map(name => {
            const pricing = selectedSubcategories[name]
            return pricing ? `${name} - ${pricing.name}` : name
          }).join(", ")
        : selectedPackage,
      selected_subcategories: hasTreatmentSubcategories ? selectedSubcategories : {},
      date: selectedDate,
      time: selectedTime,
      doctor_id: selectedDoctorId,
    }

    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      // Persist pending booking so the auth flow can resume to confirmation
      try { localStorage.setItem("pendingBooking", JSON.stringify(booking)) } catch {}
      setLoading(false)
      router.push("/signup")
      return
    }

    if (rescheduleOrder) {
      // Calculate session count and pricing for reschedule
      const sessionCount = getSessionCount(selectedPackage)
      const discountPercent = Math.round(getDiscount(selectedPackage) * 100)
      const unitPrice = Math.round((basePrice * (1 - getDiscount(selectedPackage))) * 100) / 100
      const totalAmount = Math.round((unitPrice * sessionCount) * 100) / 100

      // Update the existing order with new date, time, session count, pricing, and set status to pending
      // Perform update on server-side API to avoid client/RLS issues
      try {
        const payload = {
          service_id: service.id,
          service_title: service.name,
          booking_date: selectedDate,
          booking_time: selectedTime,
          doctor_id: selectedDoctorId,
          session_count: sessionCount,
          unit_price: unitPrice,
          discount_percent: discountPercent,
          total_amount: totalAmount,
          status: "pending",
        }

        const res = await fetch(`/api/orders/${rescheduleOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          // Ensure cookies (auth session) are forwarded so server can perform the update under the user's session
          credentials: 'same-origin',
        })

        const body = await res.json()
        setLastApiResponse(body)

        // Debug logs for troubleshooting
        console.debug('reschedule response', { status: res.status, body })

        // Treat API-level success/failure according to the JSON body.
        // The server may return HTTP 200 with success: false (e.g. no rows updated),
        // so checking only `res.ok` can show misleading success toasts.
        if (!res.ok || !body?.success) {
          console.error('Reschedule failed', { status: res.status, body })
          toast({ title: 'Reschedule Error', description: body?.error || 'Unknown error', variant: 'destructive' })
        } else {
          toast({ title: 'Reschedule Success', description: body?.data ? `Updated booking (id: ${body.data.service_title})` : 'Updated booking' })
          // redirect to my-bookings after showing the toast briefly
          setTimeout(() => router.push('/my-bookings'), 1200)
        }
      } catch (err) {
        console.error('Reschedule exception', err)
        toast({ title: 'Reschedule Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
      }

      // Clear order cache so both customer and admin see updated order
      try {
        await fetch('/api/admin/clear-orders-cache', { method: 'POST' });
      } catch { }

      setLoading(false)
      return
    }

    // Normal booking flow
    localStorage.setItem("pendingBooking", JSON.stringify(booking))
    setLoading(false)
    router.push("/confirm-booking")
  }

  // Determine allowed tabs from service.session_options (support legacy array and new object shape)
  const allowedTabs = (function getAllowed() {
    try {
      const raw = service?.session_options
      if (!raw) return undefined
      const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const times = parsed.times_of_day as string[] | undefined
        if (Array.isArray(times) && times.length > 0) return times.map(t => {
          const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
          if (cap === 'Morning' || cap === 'Afternoon' || cap === 'Evening') return cap as 'Morning' | 'Afternoon' | 'Evening'
          return cap as 'Morning' | 'Afternoon' | 'Evening'
        })
      }
    } catch { }
    return undefined
  })()

  return (
    <div>
      {hasTreatmentSubcategories ? (
        // Treatment Subcategories Layout - Box Design with Grid
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-2xl font-bold mb-6 text-left">{service.name}</h2>
            
            {/* Treatment Boxes Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {treatmentSubcategories.map((subcat, index) => {
                const isSelected = selectedSubcategories[subcat.name] !== null && selectedSubcategories[subcat.name] !== undefined
                const isExpanded = expandedSubcategories.has(subcat.name)
                const selectedPricing = selectedSubcategories[subcat.name]
                
                return (
                  <div key={index} className="relative">
                    {/* Treatment Box */}
                    <div
                      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all transform ${
                        isSelected ? "ring-4 ring-primary ring-offset-2 scale-105" : "hover:shadow-xl hover:scale-102"
                      } ${isExpanded ? "mb-4" : ""}`}
                      onClick={() => toggleSubcategoryExpanded(subcat.name)}
                    >
                      {/* Image with Semi-Transparent Teal/Mint Green Overlay */}
                      {subcat.image && subcat.image.trim() !== "" ? (
                        <div className="relative w-full aspect-square overflow-hidden bg-gray-200">
                          {/* Background Image - Using both Next Image and fallback */}
                          <div className="absolute inset-0">
                            <Image
                              src={subcat.image}
                              alt={subcat.name}
                              fill
                              className="object-cover"
                              priority={index < 4}
                              unoptimized
                              onError={(e) => {
                                console.error('Image failed to load:', subcat.image)
                                // Fallback to regular img tag if Next Image fails
                                const target = e.target as HTMLImageElement
                                if (target) {
                                  target.style.display = 'none'
                                }
                              }}
                            />
                          </div>
                          {/* Very Light Semi-Transparent Teal/Mint Green Overlay - Background image clearly visible */}
                          <div className="absolute inset-0 bg-gradient-to-b from-teal-500/25 via-teal-500/20 to-teal-600/25 flex items-center justify-center pointer-events-none">
                            <h3 className="text-white font-bold text-lg md:text-xl text-center px-3 drop-shadow-2xl z-10">
                              {subcat.name}
                            </h3>
                          </div>
                          {/* Selected Indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg z-20 pointer-events-none">
                              ✓
                            </div>
                          )}
                          {/* Expand Indicator */}
                          <div className="absolute bottom-2 right-2 bg-white/90 text-teal-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-md z-20 cursor-pointer hover:bg-white transition pointer-events-auto">
                            {isExpanded ? "−" : "+"}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center relative">
                          <h3 className="text-white font-bold text-lg md:text-xl text-center px-3">
                            {subcat.name}
                          </h3>
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg z-10">
                              ✓
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 bg-white/90 text-teal-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-md z-10 cursor-pointer hover:bg-white transition">
                            {isExpanded ? "−" : "+"}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Expanded Pricing Options - Dropdown Style with Scroll */}
                    {isExpanded && (
                      <div className="mt-3 bg-white border-2 border-teal-200 rounded-xl p-4 shadow-xl animate-in slide-in-from-top-2 duration-300">
                        <div className="mb-3">
                          <Label className="text-base font-semibold text-gray-700">Select Option:</Label>
                        </div>
                        <Select
                          value={selectedPricing ? `${selectedPricing.name}|${selectedPricing.price}` : undefined}
                          onValueChange={(value) => {
                            const [name, priceStr] = value.split('|')
                            const price = parseFloat(priceStr)
                            const pricingOption = subcat.pricing.find(p => p.name === name && p.price === price)
                            if (pricingOption) {
                              toggleSubcategoryPricing(subcat.name, pricingOption)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Select a pricing option" />
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[300px] overflow-y-auto">
                            {subcat.pricing.length === 0 ? (
                              <SelectItem value="__no_options__" disabled>
                                No pricing options available
                              </SelectItem>
                            ) : (
                              subcat.pricing.map((pricingOption, priceIndex) => {
                                const optionValue = `${pricingOption.name}|${pricingOption.price}`
                                return (
                                  <SelectItem key={priceIndex} value={optionValue}>
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-medium">{pricingOption.name}</span>
                                      <span className="ml-4 font-bold text-primary">{formatPrice(pricingOption.price)}</span>
                                    </div>
                                  </SelectItem>
                                )
                              })
                            )}
                          </SelectContent>
                        </Select>
                        {selectedPricing && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Selected:</span>
                              <span className="font-semibold text-primary">{selectedPricing.name} - {formatPrice(selectedPricing.price)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary Section */}
          {Object.keys(selectedSubcategories).length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold mb-4">Summary</h2>
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-sm font-semibold">Treatment</th>
                        <th className="text-right px-4 py-2 text-sm font-semibold">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedSubcategories).map(([subcatName, pricingOption]) => {
                        if (!pricingOption) return null
                        return (
                          <tr key={subcatName} className="border-t">
                            <td className="px-4 py-2 font-medium">{subcatName} - {pricingOption.name}</td>
                            <td className="px-4 py-2 text-right font-semibold">{formatPrice(pricingOption.price)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Number Of Sessions</span>
                    <span className="font-semibold">{Object.keys(selectedSubcategories).length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(calculateSubcategoryTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Original Session Packages Layout
        <section className="max-w-3xl mx-auto mb-8">
          <div className="bg-muted rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xl font-semibold">Select package</div>
            </div>
            {service.description && (
              <div className="text-muted-foreground text-base mb-4">
                {service.description}
              </div>
            )}
            <div className="flex flex-col gap-4">
              {servicePackages.map((p) => {
                const count = getSessionCount(p)
                const discount = getDiscount(p)
                const perSession = basePrice * (1 - discount)
                const total = perSession * count
                const totalSave = basePrice * count - total
                return (
                  <div
                    key={p}
                    onClick={() => { setUserInteracted(true); console.log('select package', p); setSelectedPackage(p) }}
                    className={`border rounded-xl px-4 py-2 flex items-center justify-between hover:shadow-md hover:bg-white hover:text-black transition cursor-pointer ${selectedPackage === p ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                  >
                    <div>
                      <div className="text-lg font-semibold">{p}</div>
                      <div className="text-sm text-muted-foreground">{count} × {formatPrice(perSession)} per session</div>
                      {discount > 0 && (
                        <div className="text-xs text-green-700 mt-1">Save {Math.round(discount * 100)}% — you save {formatPrice(totalSave)}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatPrice(perSession)}</div>
                      <div className="text-muted-foreground text-xs">per session</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-3xl mx-auto mb-8">
        <div className="bg-muted rounded-xl shadow p-4">
          <div className="space-y-2">
            <Label htmlFor="doctor" className="text-xl font-semibold">Select Doctor *</Label>
            {loadingDoctors ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                Loading doctors...
              </div>
            ) : (
              <Select
                value={selectedDoctorId || undefined}
                onValueChange={(value) => {
                  setSelectedDoctorId(value)
                }}
                required
              >
                <SelectTrigger id="doctor" className="w-full bg-white">
                  <SelectValue placeholder="Select a doctor (required)" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {doctors.length === 0 ? (
                    <SelectItem value="__no_doctors__" disabled>
                      No doctors available
                    </SelectItem>
                  ) : (
                    doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                        {doctor.specialization && ` - ${doctor.specialization}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {!selectedDoctorId && !loadingDoctors && doctors.length > 0 && (
              <p className="text-sm text-destructive mt-1">Please select a doctor to continue</p>
            )}
          </div>
        </div>
      </section>

      <ServiceDateSelector allowedTabs={allowedTabs} onChange={(s: { date?: string | null; time?: string | null }) => {
        setSelectedDate(s.date || null)
        setSelectedTime(s.time || null)
      }} />

      {/* Book Button */}
      <div className="flex justify-center items-center my-8">
        <Button 
          onClick={handleBook} 
          className="bg-[#333] text-white text-lg font-semibold rounded-full px-10 py-4 shadow-md hover:bg-[#222] transition-all" 
          style={{ minWidth: 320 }} 
          disabled={loading || (hasTreatmentSubcategories && Object.keys(selectedSubcategories).length === 0) || !selectedDoctorId || !selectedDate || !selectedTime}
        >
          {loading ? (rescheduleOrder ? "Updating..." : "Booking...") : (rescheduleOrder ? "Update Your Booking" : "Book Treatment")}
        </Button>
      </div>

        {process.env.NODE_ENV !== 'production' && lastApiResponse ? (
          <div className="max-w-3xl mx-auto mt-4 p-3 rounded-md bg-red-50 text-sm text-red-900">
            <div className="font-medium mb-2">API Response (dev)</div>
            <pre className="whitespace-pre-wrap break-words text-xs max-h-48 overflow-auto">{JSON.stringify(lastApiResponse, null, 2)}</pre>
          </div>
        ) : null}
    </div>
  )
}
