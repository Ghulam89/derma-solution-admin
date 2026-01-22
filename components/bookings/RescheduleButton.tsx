"use client"
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";

export default function RescheduleButton({ serviceId, orderId }: { serviceId: string, orderId: string }) {
  return (
    <Button
      variant="outline"
      className="flex items-center gap-2"
      onClick={() => {
        if (serviceId && orderId) {
          window.location.href = `/services/${serviceId}?reschedule=${orderId}`;
        }
      }}
    >
      <RefreshCcw className="w-4 h-4 mr-1" /> Reschedule
    </Button>
  );
}
