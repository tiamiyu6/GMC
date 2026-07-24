"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VoucherCard from "@/components/VoucherCard";
import type { Order } from "@/lib/types";

export default function CustomerOrdersRealtime({
  userId,
  initialOrders,
}: {
  userId: string;
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          setOrders((current) => {
            if (payload.eventType === "DELETE") {
              return current.filter((o) => o.id !== (payload.old as Order).id);
            }
            const incoming = payload.new as Order;
            const existingIndex = current.findIndex((o) => o.id === incoming.id);
            if (existingIndex === -1) {
              // New order rows arrive without the joined package - the page
              // will have the full record on next load/refresh.
              return [incoming, ...current];
            }
            const next = [...current];
            next[existingIndex] = { ...next[existingIndex], ...incoming };
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (orders.length === 0) {
    return (
      <div className="card text-center text-sm text-slate-500">
        You haven&apos;t ordered any vouchers yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <VoucherCard key={order.id} order={order} />
      ))}
    </div>
  );
}
