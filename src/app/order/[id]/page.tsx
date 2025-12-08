import { supabase } from "@/lib/supabase";
import OrderClient from "./OrderClient";
import { MenuItem, Category } from "@/lib/types"; // ✅ Import Category

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;

  // 1. ดึงข้อมูลเมนู
  const { data: menuData } = await supabase
    .from("menu_items")
    .select("*") 
    .eq("is_available", true)
    .order("category_id", { ascending: true });

  // 2. ดึงข้อมูลหมวดหมู่ (Categories) ✅ เพิ่มส่วนนี้
  const { data: categoryData } = await supabase
    .from("categories")
    .select("*")
    .order("id", { ascending: true });

  // 3. ดึงข้อมูลชื่อโต๊ะ
  const { data: orderData } = await supabase
    .from("orders")
    .select("tables (label)")
    .eq("id", orderId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableLabel = (orderData?.tables as any)?.label || "Unknown";

  return (
    <OrderClient 
      initialMenuItems={(menuData as MenuItem[]) || []} 
      categories={(categoryData as Category[]) || []} // ✅ ส่ง Categories ไป
      orderId={orderId} 
      tableLabel={tableLabel} 
    />
  );
}