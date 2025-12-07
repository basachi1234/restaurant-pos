"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Power, LockKeyhole, TrendingUp, Utensils, Users, Wallet, FileText, TicketPercent, Settings as SettingsIcon, Banknote
} from "lucide-react"; 
import { useRouter } from "next/navigation";
import { MenuItem, Category, UserProfile, Transaction, TopItem, Discount } from "@/lib/types";

// Import Components
import AdminLogin from "@/components/admin/AdminLogin";
import DashboardTab from "@/components/admin/DashboardTab";
import MenuTab from "@/components/admin/MenuTab";
import SettingsTab from "@/components/admin/SettingsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import AccountingTab from "@/components/admin/AccountingTab";
import StaffTab from "@/components/admin/StaffTab";
import DiscountsTab from "@/components/admin/DiscountsTab";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'staff' | 'accounting' | 'reports' | 'discounts' | 'settings'>('dashboard');

  // Global Data State
  const [stats, setStats] = useState<any>({ totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 });
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [activeTableCount, setActiveTableCount] = useState(0);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  const fetchData = async () => {
    // 1. Basic Data
    const { data: menuData } = await supabase.from("menu_items").select("*").order("id");
    const { data: catData } = await supabase.from("categories").select("*").order("id");
    const { data: userData } = await supabase.from("users").select("*").order("role").order("name");
    const { data: transData } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
    const { data: discData } = await supabase.from("discounts").select("*").order("id");
    const { data: storeSettings } = await supabase.from("store_settings").select("is_open").eq("id", 1).single();
    const { count: occupiedCount } = await supabase.from("tables").select("*", { count: 'exact', head: true }).eq("status", "occupied");

    if (menuData) setMenuItems(menuData);
    if (catData) setCategories(catData);
    if (userData) setUsers(userData as UserProfile[]);
    if (transData) setTransactions(transData as any[]);
    if (discData) setDiscounts(discData as any[]);
    if (storeSettings) setIsStoreOpen(storeSettings.is_open);
    setActiveTableCount(occupiedCount || 0);

    // 2. Stats (Today)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const { data: orders } = await supabase.from("orders").select(`id, total_price, order_items ( quantity, menu_items ( name, price ) )`).eq("status", "completed").gte("created_at", todayISO);
    
    if (orders) {
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
      setStats({ totalRevenue, totalOrders: orders.length, averageOrderValue: orders.length ? totalRevenue / orders.length : 0 });
      
      const itemMap: Record<string, TopItem> = {};
      orders.forEach((o: any) => { o.order_items.forEach((oi: any) => { 
          const name = oi.menu_items?.name || 'Unknown'; 
          const revenue = (oi.menu_items?.price || 0) * oi.quantity; 
          if (itemMap[name]) { itemMap[name].quantity += oi.quantity; itemMap[name].revenue += revenue; } 
          else { itemMap[name] = { name, quantity: oi.quantity, revenue }; } 
      }); });
      setTopItems(Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5));
    }
  };

  useEffect(() => { if(isAuthenticated) fetchData(); }, [isAuthenticated]);

  const toggleStoreStatus = async () => {
    const action = isStoreOpen ? "ปิด" : "เปิด";
    if(!confirm(`ยืนยัน "${action}ร้าน"?`)) return;
    
    if (isStoreOpen) { // Closing shop logic
        try {
          const { data: lastTrans } = await supabase.from("transactions").select("created_at").eq("type", "income").like("description", "ยอดขายปิดร้าน%").order("created_at", { ascending: false }).limit(1).single();
          let startTime = new Date(); startTime.setHours(0, 0, 0, 0); 
          if (lastTrans) startTime = new Date(lastTrans.created_at);
  
          const { data: orders } = await supabase.from("orders").select("total_price").eq("status", "completed").gt("created_at", startTime.toISOString());
          const totalSales = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  
          if (totalSales > 0) {
             const now = new Date(); let recordDate = new Date(now);
             if (now.getHours() < 6) { recordDate.setDate(recordDate.getDate() - 1); recordDate.setHours(23, 59, 59, 999); }
             await supabase.from("transactions").insert({ type: 'income', amount: totalSales, description: `ยอดขายปิดร้าน (${recordDate.toLocaleDateString('th-TH')})`, created_at: recordDate.toISOString() });
             alert(`บันทึกยอดขาย ${totalSales.toLocaleString()} ฿ แล้ว`);
          } else { alert("ปิดร้านเรียบร้อย (ไม่มียอดขายใหม่)"); }
        } catch (e) { console.error(e); alert("Error summarizing sales"); }
    } else { alert("เปิดร้านแล้ว"); }

    const newStatus = !isStoreOpen;
    await supabase.from("store_settings").update({ is_open: newStatus }).eq("id", 1);
    setIsStoreOpen(newStatus);
    fetchData();
  };

  const handleLogout = () => {
    document.cookie = "user_role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  if (!isAuthenticated) return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <button onClick={() => router.push("/")} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ArrowLeft size={20}/></button>
            <div><h1 className="text-2xl font-bold text-gray-800">Restaurant Manager</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleStoreStatus} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm ${isStoreOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <Power size={16}/> {isStoreOpen ? "ร้านเปิด" : "ร้านปิด"}
            </button>
            <button onClick={handleLogout} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><LockKeyhole size={16}/> ออก</button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
           <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 text-sm whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}><TrendingUp size={16}/> ภาพรวม</button>
           <button onClick={() => setActiveTab('reports')} className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 text-sm whitespace-nowrap ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}><FileText size={16}/> รายงาน</button>
           <button onClick={() => setActiveTab('accounting')} className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 text-sm whitespace-nowrap ${activeTab === 'accounting' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}><Wallet size={16}/> บัญชี</button>
           <button onClick={() => setActiveTab('menu')} className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 text-sm whitespace-nowrap ${activeTab === 'menu' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}><Banknote size={16}/> เมนู</button>
           <button onClick={() => setActiveTab('discounts')} className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 text-sm whitespace-nowrap ${activeTab === 'discounts' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}><TicketPercent size={16}/> โปรโมชั่น</button>
           <button onClick={() => setActiveTab('staff')} className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 text-sm whitespace-nowrap ${activeTab === 'staff' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}><Users size={16}/> พนักงาน</button>
           <button onClick={() => setActiveTab('settings')} className={`px-5 py-2 rounded-full font-bold flex items-center gap-2 text-sm whitespace-nowrap ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}><SettingsIcon size={16}/> ตั้งค่าร้าน</button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'dashboard' && <DashboardTab stats={stats} activeTableCount={activeTableCount} topItems={topItems} />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'accounting' && <AccountingTab transactions={transactions} onUpdate={fetchData} />}
        {activeTab === 'menu' && <MenuTab menuItems={menuItems} categories={categories} onUpdate={fetchData} />}
        {activeTab === 'discounts' && <DiscountsTab discounts={discounts} onUpdate={fetchData} />}
        {activeTab === 'staff' && <StaffTab users={users} onUpdate={fetchData} />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}