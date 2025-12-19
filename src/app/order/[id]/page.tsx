import { supabase } from "@/lib/supabase";
import OrderClient from "./OrderClient";
import { MenuItem, Category } from "@/lib/types";
import { getSession } from "@/app/actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;

  // ✅ เปลี่ยนมาใช้ Promise.all เพื่อดึงข้อมูล 4 อย่าง "พร้อมกัน" แทนการรอทีละบรรทัด
  const [session, menuResponse, categoryResponse, orderResponse] = await Promise.all([
    getSession(),
    supabase.from("menu_items").select("*").eq("is_available", true).order("category_id", { ascending: true }),
    supabase.from("categories").select("*").order("id", { ascending: true }),
    supabase.from("orders").select("table_id, tables (label)").eq("id", orderId).single()
  ]);

  const userRole = session.role || "guest";
  const menuData = menuResponse.data;
  const categoryData = categoryResponse.data;
  const orderData = orderResponse.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableLabel = (orderData?.tables as any)?.label || "Unknown";
  const tableId = orderData?.table_id || 0;

  return (
    <OrderClient 
      initialMenuItems={(menuData as MenuItem[]) || []} 
      categories={(categoryData as Category[]) || []} 
      orderId={orderId} 
      tableLabel={tableLabel} 
      tableId={tableId}
      userRole={userRole} 
    />
  );
}