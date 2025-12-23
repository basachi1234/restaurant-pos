"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut, Lock, Utensils, ShoppingBag } from "lucide-react";
import { logout, getSession } from "./actions";

type Table = {
  id: number;
  label: string;
  status: "available" | "occupied";
};

export default function Home() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Store Info
  const [shopName, setShopName] = useState("ร้านอาหาร");
  const [shopLogo, setShopLogo] = useState<string | null>(null);

  // ✅ 1. เพิ่ม State เก็บเวลาเปิด-ปิดอัตโนมัติ
  const [autoOpenTime, setAutoOpenTime] = useState<string | null>(null);
  const [autoCloseTime, setAutoCloseTime] = useState<string | null>(null);

  const router = useRouter();

  // ✅ 2. ฟังก์ชันเช็คว่าตอนนี้ร้านควรเปิดหรือไม่ (ตามเวลา)
  const checkIsShopOpenByTime = useCallback((openTime: string, closeTime: string) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [openH, openM] = openTime.split(':').map(Number);
    const startMinutes = openH * 60 + openM;
    
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const endMinutes = closeH * 60 + closeM;

    // กรณีร้านเปิดข้ามวัน (เช่น ปิดตี 2 -> endMinutes น้อยกว่า startMinutes)
    if (endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    // กรณีเปิดปิดในวันเดียว (เช่น 10:00 - 22:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }, []);

  // ✅ 3. ปรับปรุง fetchData ให้ดึงเวลาและคำนวณสถานะเริ่มต้น
  const fetchData = useCallback(async () => {
    const [tablesRes, settingsRes] = await Promise.all([
        supabase.from("tables").select("*").order("id", { ascending: true }),
        supabase.from("store_settings").select("*").eq("id", 1).single()
    ]);

    if (tablesRes.data) setTables(tablesRes.data);

    if (settingsRes.data) {
      // เก็บค่าเวลาไว้ใน State
      setAutoOpenTime(settingsRes.data.auto_open_time);
      setAutoCloseTime(settingsRes.data.auto_close_time);
      
      setShopName(settingsRes.data.shop_name || "ร้านอาหาร");
      setShopLogo(settingsRes.data.shop_logo_url || null);

      // คำนวณสถานะร้าน: ต้องเปิดทั้งใน DB และ ตามเวลา (ถ้าตั้งไว้)
      const dbIsOpen = settingsRes.data.is_open;
      let timeIsOpen = true;

      if (settingsRes.data.auto_open_time && settingsRes.data.auto_close_time) {
         timeIsOpen = checkIsShopOpenByTime(settingsRes.data.auto_open_time, settingsRes.data.auto_close_time);
      }

      setIsStoreOpen(dbIsOpen && timeIsOpen);
    }
  }, [checkIsShopOpenByTime]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const session = await getSession();
        setUserRole(session.role || null); 
      } catch (err) {
        console.error("Error checking session:", err);
      }
    };
    checkUser();

    fetchData();

    // Realtime Subscriptions
    const channelTables = supabase.channel("realtime-tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => fetchData())
      .subscribe();
      
    const channelSettings = supabase.channel("realtime-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, () => fetchData())
      .subscribe();

    return () => { 
      supabase.removeChannel(channelTables); 
      supabase.removeChannel(channelSettings); 
    };
  }, [fetchData]);

  // ✅ 4. เพิ่ม Interval เช็คเวลาทุก 1 นาที (Auto Close หน้าบ้าน)
  useEffect(() => {
    if (!autoOpenTime || !autoCloseTime) return;

    const interval = setInterval(() => {
      const isOpenByTime = checkIsShopOpenByTime(autoOpenTime, autoCloseTime);
      
      // ถ้าเวลาบอกว่าปิดแล้ว แต่หน้าจอยังแสดงว่าเปิดอยู่ -> สั่งปิดเลย
      if (!isOpenByTime && isStoreOpen) {
        setIsStoreOpen(false);
      }
      // ถ้าถึงเวลาเปิด แล้วหน้าจอยังปิดอยู่ -> โหลดข้อมูลใหม่ (เผื่อสถานะใน DB เปลี่ยน)
      else if (isOpenByTime && !isStoreOpen) {
         fetchData(); 
      }
    }, 60000); // เช็คทุก 1 นาที

    return () => clearInterval(interval);
  }, [autoOpenTime, autoCloseTime, isStoreOpen, checkIsShopOpenByTime, fetchData]);


  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handleTableClick = async (table: Table) => {
    // ✅ 5. เช็คเวลาอีกครั้งก่อนกด (Lazy Check) กันคนเปิดหน้าค้างไว้
    if (autoOpenTime && autoCloseTime) {
       const isOpenByTime = checkIsShopOpenByTime(autoOpenTime, autoCloseTime);
       if (!isOpenByTime) {
          setIsStoreOpen(false); 
          return alert("⛔ ร้านปิดให้บริการแล้วครับ (หมดเวลาทำการ)");
       }
    }

    if (!isStoreOpen) return alert("⛔ ร้านปิดอยู่ครับ"); 
    if (isProcessing) return; 

    if (table.status === "available") {
      const type = table.label.startsWith("TA") ? "สั่งกลับบ้าน (Takeaway)" : "โต๊ะ";
      const confirmOpen = confirm(`เปิดบิล ${type} ${table.label} ?`);
      if (!confirmOpen) return;

      setIsProcessing(true); 

      try {
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({ table_id: table.id, status: "active" })
          .select()
          .single();
          
        if (orderError) throw orderError;
        
        await supabase.from("tables").update({ status: "occupied" }).eq("id", table.id);
        
        router.push(`/order/${newOrder.id}`);
      } catch (error) { 
        console.error("Error opening table:", error); 
        alert("เกิดข้อผิดพลาดในการเปิดบิล"); 
        setIsProcessing(false); 
      }
    } else {
      setIsProcessing(true);
      const { data: activeOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("table_id", table.id)
        .eq("status", "active")
        .single();
        
      if (activeOrder) {
        router.push(`/order/${activeOrder.id}`);
      } else {
        alert("ไม่พบข้อมูลออเดอร์");
        setIsProcessing(false);
      }
    }
  };

  const takeawayTables = tables.filter(t => t.label.startsWith("TA"));
  const dineInTables = tables.filter(t => !t.label.startsWith("TA"));

  const getTableColor = (status: string, isTakeaway: boolean, isOpen: boolean) => {
    if (status === 'occupied') return 'btn-error text-white'; 
    if (!isOpen) return 'btn-disabled opacity-50'; 
    if (isTakeaway) return 'btn-outline btn-warning hover:btn-warning hover:text-white';
    return 'btn-outline btn-success hover:btn-success hover:text-white';
  };

  const TableButton = ({ table, isTakeaway = false }: { table: Table, isTakeaway?: boolean }) => (
    <button
      onClick={() => handleTableClick(table)}
      disabled={isProcessing}
      className={`
        btn h-auto min-h-[6rem]
        flex-col flex-nowrap gap-1 relative overflow-hidden shadow-sm transition-all hover:scale-105 active:scale-95
        ${getTableColor(table.status, isTakeaway, isStoreOpen)}
        aspect-[3/2]
      `}
    >
      <span className="z-10 text-xl font-bold flex flex-col items-center">
        {isTakeaway && <ShoppingBag className="w-5 h-5 mb-1" />} 
        {table.label}
      </span>
      <span className="text-xs font-normal opacity-80 z-10 capitalize">
        {table.status === "available" ? (isStoreOpen ? "ว่าง" : "ปิด") : "ไม่ว่าง"}
      </span>
      {isProcessing && <span className="loading loading-spinner absolute inset-0 m-auto bg-black/20 rounded-lg"></span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-6 pb-20">
      
      {/* Header */}
      <div className="navbar bg-base-100 rounded-box shadow-sm mb-6 px-4">
        <div className="flex-1 gap-3">
           <div className="avatar">
             <div className="w-10 md:w-12 rounded-full ring ring-base-300 ring-offset-base-100 ring-offset-2">
               {shopLogo ? (
                 <img src={shopLogo} alt="Logo" />
               ) : (
                 <div className="bg-neutral text-neutral-content w-full h-full flex items-center justify-center">
                   <Utensils size={20}/>
                 </div>
               )}
             </div>
           </div>
           <div>
              <h1 className="text-lg md:text-xl font-bold px-2">{shopName}</h1>
              {!isStoreOpen && (
                <div className="badge badge-error gap-1 ml-2 font-bold text-white shadow-sm animate-pulse">
                  <Lock size={10} /> ปิดร้าน (OFFLINE)
                </div>
              )}
           </div>
        </div>

        <div className="flex-none flex items-center gap-2">
           {/* ปุ่มครัว */}
           <Link href="/kitchen" className="btn btn-neutral btn-sm md:btn-md shadow-sm">
             👨‍🍳 <span className="hidden md:inline">ครัว</span>
           </Link>

           {/* ปุ่ม Owner */}
           {userRole === 'owner' && (
            <>
              <Link href="/cashier" className="btn btn-primary btn-sm md:btn-md text-white shadow-sm">
                💵 <span className="hidden md:inline">แคชเชียร์</span>
              </Link>
              <Link href="/admin" className="btn btn-ghost btn-circle" title="ตั้งค่า">
                <Settings size={18} />
              </Link>
            </>
          )}
          
          {/* ปุ่มออก */}
          <button onClick={handleLogout} className="btn btn-error btn-outline btn-sm md:btn-md shadow-sm">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {!isStoreOpen && (
        <div className="alert alert-error shadow-lg mb-6 text-white">
          <Lock />
          <div>
            <h3 className="font-bold">ระบบปิดรับออเดอร์ชั่วคราว</h3>
            <div className="text-xs">ไม่สามารถเปิดบิลใหม่ได้ กรุณาเปิดร้านที่หน้า Admin (หรือรอเวลาเปิดทำการ)</div>
          </div>
        </div>
      )}

      {/* --- ส่วนที่ 1: ทานที่ร้าน (Dine-in) --- */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-base-content mb-4 flex items-center gap-2">
          <Utensils className="text-success" /> ทานที่ร้าน (Dine-in)
        </h2>
        <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${!isStoreOpen ? 'opacity-60 pointer-events-none' : ''}`}>
          {dineInTables.map(table => <TableButton key={table.id} table={table} />)}
        </div>
      </div>

      <div className="divider my-8"></div>

      {/* --- ส่วนที่ 2: สั่งกลับบ้าน (Takeaway) --- */}
      <div>
        <h2 className="text-xl font-bold text-base-content mb-4 flex items-center gap-2">
          <ShoppingBag className="text-warning" /> สั่งกลับบ้าน (Takeaway)
        </h2>
        <div className={`grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 ${!isStoreOpen ? 'opacity-60 pointer-events-none' : ''}`}>
          {takeawayTables.map(table => <TableButton key={table.id} table={table} isTakeaway={true} />)}
        </div>
      </div>
    </div>
  );
}