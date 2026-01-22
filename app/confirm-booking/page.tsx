"use client"
import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { parseBookingDateTime } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"

export default function ConfirmBookingPage() {
  const router = useRouter()
  const [booking, setBooking] = useState<any | null>(null)
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [serviceDetails, setServiceDetails] = useState<any | null>(null)
  const [doctorDetails, setDoctorDetails] = useState<any | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const raw = localStorage.getItem('pendingBooking')
    if (raw) setBooking(JSON.parse(raw))

    const supabase = createClient()
    supabase.auth.getUser().then(async (res) => {
      if (res.data?.user) {
        setUser(res.data.user)
        try {
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', res.data.user.id).single()
          if (prof) setProfile(prof)
        } catch (e) {
          // ignore
        }
      } else {
        // Instead of an immediate redirect, show a friendly call-to-action
        // so the user can navigate to sign in and return to confirm booking.
        setNeedsAuth(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!booking?.service_id) return
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('services').select('*').eq('id', booking.service_id).single()
        if (data) setServiceDetails(data)
      } catch (e) {
        // ignore
      }
    })()
  }, [booking])

  useEffect(() => {
    if (!booking?.doctor_id) return
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('doctors').select('*').eq('id', booking.doctor_id).single()
        if (data) setDoctorDetails(data)
      } catch (e) {
        // ignore
      }
    })()
  }, [booking])

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

  const handleConfirm = async () => {
    if (!booking) return
    
    if (!booking.doctor_id) {
      toast({
        title: "Doctor Selection Required",
        description: "Please go back and select a doctor before confirming your booking",
        variant: "destructive",
      })
      return
    }
    
    setLoading(true)
    try {
      const basePrice = Number(serviceDetails?.base_price ?? 0)
      
      // Check if booking has selected_subcategories (treatment subcategories feature)
      let sessionCount = 1
      let unitPrice = basePrice
      let discountPercent = 0
      let totalAmount = basePrice
      
      if (booking.selected_subcategories && typeof booking.selected_subcategories === 'object' && Object.keys(booking.selected_subcategories).length > 0) {
        // Calculate total from selected subcategories (new format: {subcatName: {name, price}})
        const selectedSubcats = booking.selected_subcategories as { [key: string]: { name: string; price: number } }
        
        totalAmount = 0
        Object.values(selectedSubcats).forEach((pricingOption: any) => {
          if (pricingOption && pricingOption.price) {
            totalAmount += pricingOption.price
          }
        })
        unitPrice = totalAmount
        sessionCount = Object.keys(selectedSubcats).length
      } else {
        // Use legacy session-based pricing
        sessionCount = getSessionCount(booking.package)
        discountPercent = Math.round(getDiscount(booking.package) * 100)
        unitPrice = Math.round((basePrice * (1 - getDiscount(booking.package))) * 100) / 100
        totalAmount = Math.round((unitPrice * sessionCount) * 100) / 100
      }

      const payload = {
        service_id: booking.service_id,
        service_title: booking.service_name,
        package: booking.package,
        date: booking.date,
        time: booking.time,
        doctor_id: booking.doctor_id,
        address: address,
        notes: null,
        unit_price: unitPrice,
        session_count: sessionCount,
        discount_percent: discountPercent,
        total_amount: totalAmount,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err?.error || 'Failed to create booking')
        setLoading(false)
        return
      }
      // success toast, clear pending and redirect
      toast({ title: 'Booking confirmed', description: 'Your appointment has been created.' })
      localStorage.removeItem('pendingBooking')
      router.push('/book-consultation')
    } catch (e) {
      alert('Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  // Check if booking has selected_subcategories
  const hasSelectedSubcategories = booking?.selected_subcategories && typeof booking.selected_subcategories === 'object' && Object.keys(booking.selected_subcategories).length > 0
  const selectedSubcategories = hasSelectedSubcategories ? (booking.selected_subcategories as { [key: string]: { name: string; price: number } }) : null

  if (!booking) return <div className="p-8">No pending booking found.</div>
  return (
    <>
      <div className="max-w-2xl mx-auto p-8">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.push(serviceDetails?.id ? `/services/${serviceDetails.id}` : '/services')}>← Back to Services</Button>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-primary/20">
        <h2 className="text-2xl font-bold mb-6">Review & Confirm Your Booking</h2>
        
        {/* Selected Treatments Summary */}
        {hasSelectedSubcategories && selectedSubcategories && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">Selected Treatments</h4>
            <div className="border rounded-lg overflow-hidden">
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
            <div className="flex justify-between items-center text-lg font-bold pt-3 border-t mt-3">
              <span>Total</span>
              <span className="text-primary">{formatPrice(Object.values(selectedSubcategories).reduce((sum, opt) => sum + (opt?.price || 0), 0))}</span>
            </div>
          </div>
        )}

        {/* Booking Details */}
        <div className="mb-6 space-y-3">
          <h4 className="text-lg font-semibold mb-3">Booking Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Service</div>
              <div className="font-semibold">{booking.service_name}</div>
            </div>
            {!hasSelectedSubcategories && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Package</div>
                <div className="font-semibold">{booking.package}</div>
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Doctor</div>
              <div className="font-semibold">
                {doctorDetails ? `Dr. ${doctorDetails.first_name} ${doctorDetails.last_name}${doctorDetails.specialization ? ` - ${doctorDetails.specialization}` : ''}` : booking.doctor_id ? 'Loading...' : 'Not selected'}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Date</div>
              <div className="font-semibold">
                {(() => {
                  try {
                    const d = parseBookingDateTime(booking.date, '00:00:00')
                    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  } catch { return booking.date }
                })()}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Time</div>
              <div className="font-semibold">
                {(() => {
                  try {
                    const dt = parseBookingDateTime(booking.date, booking.time)
                    return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                  } catch { return booking.time }
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        {needsAuth && !user ? (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="mb-4">Please sign in to confirm your pending booking.</p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/signin')}>Sign In</Button>
              <Button variant="ghost" onClick={() => router.push('/')}>Back to Dashboard</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Name</div>
                  <div className="font-semibold">{user?.user_metadata?.first_name || ''} {user?.user_metadata?.last_name || ''}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Email</div>
                  <div className="font-semibold">{user?.email || ''}</div>
                </div>
              </div>
            </div>

            {/* Pricing Summary (for non-subcategory bookings) */}
            {!hasSelectedSubcategories && serviceDetails && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-semibold mb-3">Pricing Summary</h4>
                {(() => {
                  const basePrice = Number(serviceDetails.base_price ?? 0)
                  const count = getSessionCount(booking.package)
                  const discount = getDiscount(booking.package)
                  const perSession = basePrice * (1 - discount)
                  const total = perSession * count
                  const totalSave = basePrice * count - total
                  return (
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-lg font-semibold">{formatPrice(total)}</div>
                        <div className="text-xs text-muted-foreground">{count} × {formatPrice(perSession)} per session</div>
                      </div>
                      <div className="text-right">
                        {discount > 0 ? (
                          <div className="text-sm text-green-700">Save {Math.round(discount * 100)}% — {formatPrice(totalSave)}</div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No discount</div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="mb-6">
              <label className="block mb-2 font-medium">Address</label>
              <Input value={address} onChange={(e:any) => setAddress(e.target.value)} placeholder="Enter delivery address" />
            </div>

            {/* Confirm Button */}
            <div className="pt-4 border-t">
              <Button 
                onClick={handleConfirm} 
                className="w-full bg-[#333] text-white text-lg font-semibold rounded-full py-6 shadow-lg hover:bg-[#222] transition-all" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Confirming...
                  </span>
                ) : (
                  "Confirm & Book Now"
                )}
              </Button>
              <div className="mt-3 text-center">
                <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  )
}
