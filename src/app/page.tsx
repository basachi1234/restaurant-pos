"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut, Lock, Utensils, ShoppingBag } from "lucide-react"; 

// ฟังก์ชันอ่าน Cookie เพื่อดูว่าเป็น Owner หรือ Staff
const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : undefined;
};

type Table = {
  id: number;
  label: string;
  status: "available" | "occupied";
};

export default function Home() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  
  // Store Info
  const [shopName, setShopName] = useState("ร้านอาหาร");
  const [shopLogo, setShopLogo] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    // 1. อ่าน Role ทันทีที่โหลดหน้า
    const role = getCookie('user_role');
    setUserRole(role);
    
    fetchData();

    const channelTables = supabase.channel("realtime-tables").on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => fetchData()).subscribe();
    const channelSettings = supabase.channel("realtime-settings").on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, () => fetchData()).subscribe();

    return () => { supabase.removeChannel(channelTables); supabase.removeChannel(channelSettings); };
  }, []);

  const fetchData = async () => {
    const { data: tableData } = await supabase.from("tables").select("*").order("id", { ascending: true });
    if (tableData) setTables(tableData);
    
    const { data: settings } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    if (settings) {
        setIsStoreOpen(settings.is_open);
        setShopName(settings.shop_name || "ร้านอาหาร");
        setShopLogo(settings.shop_logo_url);
    }
  };

  const handleLogout = () => {
    document.cookie = "user_role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const handleTableClick = async (table: Table) => {
    if (!isStoreOpen) { alert("⛔ ร้านปิดอยู่ครับ ไม่สามารถเปิดบิลใหม่ได้"); return; }
    
    const { data: settings } = await supabase.from("store_settings").select("is_open").eq("id", 1).single();
    if (settings && settings.is_open === false) { alert("⛔ ร้านปิดอยู่ครับ"); setIsStoreOpen(false); return; }

    if (table.status === "available") {
      const type = table.label.startsWith("TA") ? "สั่งกลับบ้าน (Takeaway)" : "โต๊ะ";
      const confirmOpen = confirm(`เปิดบิล ${type} ${table.label} ?`);
      if (!confirmOpen) return;

      try {
        const { data: newOrder, error: orderError } = await supabase.from("orders").insert({ table_id: table.id, status: "active" }).select().single();
        if (orderError) throw orderError;
        const { error: tableError } = await supabase.from("tables").update({ status: "occupied" }).eq("id", table.id);
        if (tableError) throw tableError;
        router.push(`/order/${newOrder.id}`);
      } catch (error) { console.error("Error opening table:", error); alert("เกิดข้อผิดพลาด"); }
    } else {
      const { data: activeOrder } = await supabase.from("orders").select("id").eq("table_id", table.id).eq("status", "active").single();
      if (activeOrder) router.push(`/order/${activeOrder.id}`); else alert("ไม่พบข้อมูลออเดอร์");
    }
  };

  const takeawayTables = tables.filter(t => t.label.startsWith("TA"));
  const dineInTables = tables.filter(t => !t.label.startsWith("TA"));

  const TableButton = ({ table, isTakeaway = false }: { table: Table, isTakeaway?: boolean }) => (
    <button
      onClick={() => handleTableClick(table)}
      className={`
        rounded-xl shadow-md font-bold transition-all transform hover:scale-105 active:scale-95
        flex flex-col items-center justify-center border-2 relative overflow-hidden
        ${isTakeaway ? 'h-24' : 'h-32'} 
        ${
          table.status === "available"
            ? isStoreOpen 
                ? isTakeaway 
                    ? "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100" 
                    : "bg-white border-green-500 text-green-600 hover:bg-green-50" 
                : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
            : "bg-red-500 border-red-600 text-white"
        }
      `}
    >
      <span className="z-10 text-xl">{isTakeaway ? <ShoppingBag className="mx-auto mb-1 w-6 h-6"/> : null} {table.label}</span>
      <span className="text-xs font-normal mt-1 opacity-80 z-10">
        {table.status === "available" ? (isStoreOpen ? "ว่าง" : "ปิด") : "กำลังรอ..."}
      </span>
      {table.status === "occupied" && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-700"></div>}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          {shopLogo ? (
            <img src={shopLogo} alt="Logo" className="w-12 h-12 rounded-full object-cover border shadow-sm" />
          ) : (
            <div className="bg-orange-100 p-2 rounded-full"><Utensils className="text-orange-600" /></div>
          )}
          <h1 className="text-3xl font-bold text-gray-800">{shopName}</h1>
          {!isStoreOpen && <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-1 shadow-sm"><Lock size={14}/> ปิด (OFFLINE)</span>}
        </div>
        
        <div className="flex gap-3 flex-wrap justify-center">
          {/* 1. ปุ่มครัว (ทุกคนเห็น) */}
          <Link href="/kitchen" className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-transform hover:scale-105">
            👨‍🍳 ครัว
          </Link>

          {/* 2. ปุ่มพิเศษสำหรับ Owner เท่านั้น (Cashier + Admin) */}
          {(userRole === 'owner') && (
             <>
               <Link href="/cashier" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-transform hover:scale-105">
                 💵 แคชเชียร์
               </Link>
               <Link href="/admin" className="bg-white border hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg shadow-sm flex items-center transition-transform hover:scale-105" title="ตั้งค่าร้าน">
                 <Settings size={20} />
               </Link>
             </>
          )}

          {/* 3. ปุ่มออกจากระบบ (ทุกคนเห็น) */}
          <button onClick={handleLogout} className="bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg shadow-sm flex items-center transition-transform hover:scale-105">
            <LogOut size={20} />
          </button>
        </div>
      </div>
      
      {!isStoreOpen && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm flex items-start gap-3"><Lock className="mt-1" /><div><p className="font-bold">⛔ ระบบปิดรับออเดอร์ชั่วคราว</p><p className="text-sm">ไม่สามารถเปิดบิลใหม่ได้</p></div></div>}
      
      {/* --- ส่วนที่ 1: ทานที่ร้าน (Dine-in) อยู่ด้านบน --- */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Utensils className="text-green-600"/> ทานที่ร้าน (Dine-in)
        </h2>
        <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 ${!isStoreOpen ? 'opacity-80' : ''}`}>
          {dineInTables.map(table => <TableButton key={table.id} table={table} />)}
        </div>
      </div>

      <hr className="my-6 border-dashed border-gray-300"/>

      {/* --- ส่วนที่ 2: สั่งกลับบ้าน (Takeaway) อยู่ด้านล่าง --- */}
      <div>
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <ShoppingBag className="text-orange-500"/> สั่งกลับบ้าน (Takeaway)
        </h2>
        <div className={`grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 ${!isStoreOpen ? 'opacity-80' : ''}`}>
          {takeawayTables.map(table => <TableButton key={table.id} table={table} isTakeaway={true} />)}
        </div>
      </div>

    </div>
  );
}