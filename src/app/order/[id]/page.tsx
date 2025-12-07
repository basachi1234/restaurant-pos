import { supabase } from "@/lib/supabase";
import OrderClient from "./OrderClient";
import { MenuItem } from "@/lib/types";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;

  // 1. ดึงข้อมูลเมนู (ดึงทั้งหมด * เพื่อให้ตรงกับ Type MenuItem)
  const { data: menuData } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_available", true)
    .order("category_id", { ascending: true });

  // 2. ดึงข้อมูลชื่อโต๊ะ
  const { data: orderData } = await supabase
    .from("orders")
    .select("tables (label)")
    .eq("id", orderId)
    .single();

  const tableLabel = (orderData?.tables as any)?.label || "Unknown";

  return (
    <OrderClient
      initialMenuItems={(menuData as MenuItem[]) || []}
      orderId={orderId}
      tableLabel={tableLabel}
    />
  );
}