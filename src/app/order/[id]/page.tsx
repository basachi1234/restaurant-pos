import { supabase } from "@/lib/supabase";
import OrderClient from "./OrderClient";
import { MenuItem, Category } from "@/lib/types";
import { getSession } from "@/app/actions"; // ✅ 1. เพิ่มบรรทัดนี้ เพื่อดึงข้อมูล Login

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;

  // ✅ 2. ดึงสถานะ User (Role) จาก Server
  const session = await getSession();
  const userRole = session.role || "guest"; // ถ้าไม่ได้ Login ให้เป็น guest

  // 3. ดึงเมนู
  const { data: menuData } = await supabase
    .from("menu_items")
    .select("*") 
    .eq("is_available", true)
    .order("category_id", { ascending: true });

  // 4. ดึงหมวดหมู่
  const { data: categoryData } = await supabase
    .from("categories")
    .select("*")
    .order("id", { ascending: true });

  // ✅ 5. แก้ไขจุดดึงข้อมูลโต๊ะ (เพิ่ม table_id)
  const { data: orderData } = await supabase
    .from("orders")
    .select("table_id, tables (label)") // เพิ่ม table_id ตรงนี้
    .eq("id", orderId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableLabel = (orderData?.tables as any)?.label || "Unknown";
  
  // ✅ 6. เตรียมตัวแปร ID โต๊ะ
  const tableId = orderData?.table_id || 0;

  return (
    <OrderClient 
      initialMenuItems={(menuData as MenuItem[]) || []} 
      categories={(categoryData as Category[]) || []} 
      orderId={orderId} 
      tableLabel={tableLabel} 
      
      // ✅ 7. ส่ง 2 ค่าใหม่นี้ไปให้หน้าจอ
      tableId={tableId}
      userRole={userRole} 
    />
  );
}