"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function OrdersPageHeader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || '')

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || '')
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      params.set('page', '1') // Reset to first page on search
      router.push(`/admin/orders?${params.toString()}`)
    })
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || '')
      if (value) {
        params.set('status', value)
      } else {
        params.delete('status')
      }
      params.set('page', '1') // Reset to first page on filter
      router.push(`/admin/orders?${params.toString()}`)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading mb-2">Bookings</h1>
          <p className="text-muted-foreground">Manage customer bookings</p>
        </div>
        <Button onClick={() => router.push("/admin/orders/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </div>
      
      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, email, or service..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(value) => handleStatusFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

