import { supabase } from "@/lib/supabase";
import OrderClient from "./OrderClient";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;

  // 1. ดึงข้อมูลเมนู (เพิ่ม is_weight เข้าไปใน select)
  const { data: menuData } = await supabase
    .from("menu_items")
    .select("id, name, price, category_id, image_url, is_weight") // ✅ เพิ่ม is_weight ตรงนี้
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
      // @ts-ignore
      initialMenuItems={menuData || []} 
      orderId={orderId} 
      tableLabel={tableLabel} 
    />
  );
}