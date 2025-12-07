"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Settings as SettingsIcon, Trash2 } from "lucide-react";
import { resizeAndUploadImage } from "@/lib/utils";

export default function SettingsTab() {
  const [shopName, setShopName] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [totalTables, setTotalTables] = useState<number | string>(0);
  const [totalTakeawayTables, setTotalTakeawayTables] = useState<number | string>(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Cleanup
  const [cleanupDate, setCleanupDate] = useState("");
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: settings } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    if (settings) {
      setShopName(settings.shop_name || "");
      setPromptPayId(settings.promptpay_id || "");
      setShopLogo(settings.shop_logo_url);
    }

    const { count: tCount } = await supabase.from("tables").select("*", { count: 'exact', head: true }).like('label', 'T%').not('label', 'like', 'TA%');
    const { count: taCount } = await supabase.from("tables").select("*", { count: 'exact', head: true }).like('label', 'TA%');
    setTotalTables(tCount || 0);
    setTotalTakeawayTables(taCount || 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let url = shopLogo;
      if (logoFile) url = await resizeAndUploadImage(logoFile);

      await supabase.from("store_settings").update({ shop_name: shopName, promptpay_id: promptPayId, shop_logo_url: url }).eq("id", 1);

      const targetT = typeof totalTables === 'string' ? parseInt(totalTables) || 0 : totalTables;
      await updateTables(targetT, 'T');

      const targetTA = typeof totalTakeawayTables === 'string' ? parseInt(totalTakeawayTables) || 0 : totalTakeawayTables;
      await updateTables(targetTA, 'TA');

      alert("บันทึกสำเร็จ! ✅");
      fetchData();
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setUploading(false);
    }
  };

  const updateTables = async (target: number, prefix: string) => {
    if (isNaN(target)) return;
    const { data: current } = await supabase.from("tables").select("id").like("label", `${prefix}%`).not('label', 'like', prefix === 'T' ? 'TA%' : 'XYZ%').order("id");
    const currentCount = current?.length || 0;

    if (target > currentCount) {
      const newTables = [];
      for (let i = currentCount + 1; i <= target; i++) newTables.push({ label: `${prefix}${i}`, status: 'available' });
      if (newTables.length) await supabase.from("tables").insert(newTables);
    } else if (target < currentCount) {
      // Note: ในการใช้งานจริงควรเช็คก่อนว่าโต๊ะว่างไหม แต่ใน Admin อนุญาตให้ลบได้เลย
      const toDel = current?.slice(target).map(t => t.id) || [];
      if (toDel.length) await supabase.from("tables").delete().in("id", toDel);
    }
  };

  const handleCleanup = async () => {
    if (!cleanupDate) return alert("กรุณาเลือกวันที่");

    // ✅ แก้ไข: ให้พิมพ์ delete ตัวเล็กหรือตัวใหญ่ก็ได้ และตัดช่องว่างออก
    const confirmMsg = prompt('พิมพ์ "DELETE" เพื่อยืนยันการลบข้อมูลถาวร');
    if (confirmMsg?.trim().toUpperCase() !== "DELETE") return;

    setIsCleaning(true);
    try {
      const cutOff = new Date(cleanupDate).toISOString();

      // 1. ดึงรายการออเดอร์เก่า
      const { data: oldOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .lt('created_at', cutOff)
        .in('status', ['completed', 'cancelled']);

      if (fetchError) throw fetchError;

      if (oldOrders && oldOrders.length > 0) {
        const ids = oldOrders.map(o => o.id);
        console.log(`กำลังลบ ${ids.length} ออเดอร์...`);

        // 2. ลบรายการอาหารในออเดอร์ก่อน (Order Items) เพื่อแก้ปัญหา Foreign Key
        const { error: itemError } = await supabase
          .from('order_items')
          .delete()
          .in('order_id', ids);

        if (itemError) throw itemError;

        // 3. ลบตัวออเดอร์ (Orders)
        const { error: orderError } = await supabase
          .from('orders')
          .delete()
          .in('id', ids);

        if (orderError) throw orderError;
      }

      // 4. ลบ Transaction (รายรับรายจ่ายอื่นๆ)
      const { error: transError } = await supabase
        .from('transactions')
        .delete()
        .lt('created_at', cutOff);

      if (transError) throw transError;

      alert("✅ ล้างข้อมูลเก่าเสร็จสิ้น");
      setCleanupDate("");

    } catch (error: any) {
      console.error("Cleanup Error:", error);
      // ✅ แสดงข้อความ Error จริงๆ ออกมาเพื่อให้รู้สาเหตุ
      alert(`เกิดข้อผิดพลาดในการลบ: ${error.message || error}`);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-700"><SettingsIcon size={20} /> ตั้งค่าร้านค้า</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="font-bold text-sm text-gray-600 block mb-1">ชื่อร้าน</label><input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full border p-3 rounded-lg" required /></div>
            <div><label className="font-bold text-sm text-gray-600 block mb-1">พร้อมเพย์</label><input type="text" value={promptPayId} onChange={e => setPromptPayId(e.target.value)} className="w-full border p-3 rounded-lg font-mono" required /></div>
            <div><label className="font-bold text-sm text-gray-600 block mb-1">จำนวนโต๊ะ (T)</label><div className="flex items-center gap-2"><input type="number" value={totalTables} onChange={e => setTotalTables(e.target.value)} className="w-24 border p-3 rounded-lg text-center font-bold" min="1" max="100" required /><span className="text-sm text-gray-500">โต๊ะ</span></div></div>
            <div><label className="font-bold text-sm text-gray-600 block mb-1">โต๊ะกลับบ้าน (TA)</label><div className="flex items-center gap-2"><input type="number" value={totalTakeawayTables} onChange={e => setTotalTakeawayTables(e.target.value)} className="w-24 border p-3 rounded-lg text-center font-bold" min="0" max="50" required /><span className="text-sm text-gray-500">คิว</span></div></div>
            <div><label className="font-bold text-sm text-gray-600 block mb-1">โลโก้</label><input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setLogoFile(e.target.files[0]) }} className="w-full border p-2 rounded text-sm bg-gray-50" />{shopLogo && !logoFile && <img src={shopLogo} className="h-16 mt-2 border p-1 rounded" alt="Logo" />}</div>
          </div>
          <button disabled={uploading} className="bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700">{uploading ? "..." : "บันทึกการตั้งค่า"}</button>
        </form>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="font-bold text-red-700 text-lg mb-4 flex items-center gap-2"><Trash2 size={24} /> ล้างข้อมูลเก่า (Maintenance)</h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <p className="text-red-800 font-bold mb-2">เลือกระยะเวลา</p>
            <p className="text-sm text-red-600 mb-4">ข้อมูลเก่ากว่าวันที่เลือกจะถูกลบถาวร (ควร Export CSV ก่อน)</p>
            <input type="date" value={cleanupDate} onChange={e => setCleanupDate(e.target.value)} className="border-2 border-red-200 p-2 rounded-lg cursor-pointer" />
          </div>
          <button onClick={handleCleanup} disabled={isCleaning || !cleanupDate} className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-xl font-bold shadow-lg disabled:bg-gray-400">{isCleaning ? "กำลังลบ..." : "⚠️ ลบข้อมูลถาวร"}</button>
        </div>
      </div>
    </div>
  );
}