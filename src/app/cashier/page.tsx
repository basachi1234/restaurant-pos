"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Printer, CheckCircle, AlertTriangle, ChefHat, TicketPercent, Ban } from "lucide-react";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

// --- ❌ ลบค่าคงที่ออก (เพราะเราจะใช้ค่าจาก Database แทน) ---
// const SHOP_PROMPTPAY_ID = "0812345678"; 
// const SHOP_NAME = "ครัวคุณแม่ (My Restaurant)";
// -------------------------------------------------------

type OrderDetail = {
  order_id: string;
  table_label: string;
  table_id: number;
  items: {
    name: string;
    price: number;
    quantity: number;
    status: string;
    promotion_qty: number;
    promotion_price: number;
  }[];
  total: number;
  pendingCount: number;
};

type Discount = {
  id: number;
  name: string;
  type: 'percent' | 'amount';
  value: number;
};

export default function CashierPage() {
  const [occupiedTables, setOccupiedTables] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");

  // Store Info (ดึงจาก DB)
  const [shopName, setShopName] = useState("กำลังโหลด..."); // ค่าเริ่มต้น
  const [promptPayId, setPromptPayId] = useState("");
  const [shopLogo, setShopLogo] = useState<string | null>(null);

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | "">("");

  useEffect(() => {
    fetchStoreInfo();
    fetchOccupiedTables();
    fetchDiscounts();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      generateQRCode();
    }
  }, [selectedOrder, promptPayId]); // สร้าง QR ใหม่เมื่อเลือกออเดอร์ หรือเมื่อเบอร์พร้อมเพย์โหลดเสร็จ

  // ดึงข้อมูลร้านค้า (ชื่อ, โลโก้, พร้อมเพย์)
  const fetchStoreInfo = async () => {
    const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    if (data) {
      setShopName(data.shop_name || "ร้านอาหาร");
      setPromptPayId(data.promptpay_id || "");
      setShopLogo(data.shop_logo_url);
    }
  };

  const fetchOccupiedTables = async () => {
    const { data: tables } = await supabase.from("tables").select("id, label, status").eq("status", "occupied").order("id");
    setOccupiedTables(tables || []);
  };

  const fetchDiscounts = async () => {
    const { data } = await supabase.from("discounts").select("*").eq("is_active", true).order("id");
    setDiscounts(data || []);
  };

  const handleSelectTable = async (tableId: number, tableLabel: string) => {
    const { data: order } = await supabase.from("orders").select(`
      id, order_items ( 
        quantity, status, 
        menu_items ( name, price, promotion_qty, promotion_price ) 
      )
    `).eq("table_id", tableId).eq("status", "active").single();

    if (!order) return alert("ไม่พบข้อมูลบิล");

    let pendingCount = 0;
    const itemMap = new Map<string, any>();

    order.order_items.forEach((i: any) => {
      if (i.status !== 'served') pendingCount += 1;
      const m = i.menu_items;
      const itemName = m.name;

      if (itemMap.has(itemName)) {
        const existing = itemMap.get(itemName);
        existing.quantity += i.quantity;
        if (i.status !== 'served') existing.status = 'pending';
      } else {
        itemMap.set(itemName, {
          name: itemName,
          price: m.price,
          quantity: i.quantity,
          status: i.status,
          promotion_qty: m.promotion_qty || 0,
          promotion_price: m.promotion_price || 0
        });
      }
    });

    const items = Array.from(itemMap.values());

    setSelectedDiscountId("");

    setSelectedOrder({
      order_id: order.id,
      table_label: tableLabel,
      table_id: tableId,
      items,
      total: 0, // จะถูกคำนวณใหม่ใน useMemo
      pendingCount,
    });
  };

  const generateQRCode = async () => {
    if (!promptPayId) return; // ถ้ายังไม่ตั้งค่าพร้อมเพย์ ไม่ต้องสร้าง QR
    try {
      const payload = generatePayload(promptPayId, { amount: 0 });
      const url = await QRCode.toDataURL(payload);
      setQrCodeData(url);
    } catch (err) { console.error("QR Gen Error", err); }
  };

  // --- Calculation Logic (คิดเงิน + โปรโมชั่น + ส่วนลด) ---
  const calculation = useMemo(() => {
    if (!selectedOrder) return { subtotal: 0, discount: 0, grandTotal: 0, discountName: "", itemDetails: [] };

    let subtotal = 0;
    const itemDetails = selectedOrder.items.map(item => {
      let itemTotal = 0;
      let note = "";

      // Logic: Bundle Promotion
      if (item.promotion_qty > 0 && item.promotion_price > 0 && item.quantity >= item.promotion_qty) {
        const bundles = Math.floor(item.quantity / item.promotion_qty);
        const remainder = item.quantity % item.promotion_qty;

        const bundleTotal = bundles * item.promotion_price;
        const remainderTotal = remainder * item.price;
        itemTotal = bundleTotal + remainderTotal;

        note = `(โปร ${item.promotion_qty} ชิ้น ${item.promotion_price}฿ x${bundles})`;
      } else {
        itemTotal = item.quantity * item.price;
      }

      subtotal += itemTotal;
      return { ...item, finalPrice: itemTotal, note };
    });

    // Logic: Discount
    let discount = 0;
    let discountName = "";

    if (selectedDiscountId) {
      const discountObj = discounts.find(d => d.id === Number(selectedDiscountId));
      if (discountObj) {
        discountName = discountObj.name;
        if (discountObj.type === 'percent') {
          discount = subtotal * (discountObj.value / 100);
        } else {
          discount = discountObj.value;
        }
      }
    }

    discount = Math.min(discount, subtotal); // ส่วนลดห้ามเกินราคาของ
    const grandTotal = Math.max(0, subtotal - discount);

    return { subtotal, discount, grandTotal, discountName, itemDetails };
  }, [selectedOrder, selectedDiscountId, discounts]);


  // --- ฟังก์ชันปิดบิล / ยกเลิกโต๊ะ ---
  const handleCloseBill = async () => {
    if (!selectedOrder) return;
    if (selectedOrder.pendingCount > 0) return alert("⚠️ อาหารยังไม่ครบ (มีรายการค้างในครัว)");

    // กรณี: ยอดเงินเป็น 0 (ไม่มีรายการ หรือหักลบหมด) -> ให้ Void
    if (calculation.grandTotal === 0 && calculation.subtotal === 0) {
      const confirmVoid = confirm(`⚠️ โต๊ะนี้ไม่มียอดสั่งอาหาร\nต้องการ "ยกเลิกโต๊ะ (Void)" ใช่หรือไม่?`);
      if (!confirmVoid) return;

      await supabase.from("orders").update({ status: "cancelled", total_price: 0 }).eq("id", selectedOrder.order_id);
      await supabase.from("tables").update({ status: "available" }).eq("id", selectedOrder.table_id);

      alert("ยกเลิกโต๊ะเรียบร้อย (ไม่บันทึกยอดขาย) 🗑️");
      setSelectedOrder(null);
      fetchOccupiedTables();
      return;
    }

    // กรณี: มียอดเงิน -> รับเงินปกติ
    const confirmClose = confirm(`💰 ยอดรับเงินสุทธิ ${calculation.grandTotal.toLocaleString()} บาท\nยืนยันการปิดบิล?`);
    if (!confirmClose) return;

    // Update Order (รายรับจะไปรวมยอดตอนปิดร้าน Daily Batch)
    await supabase.from("orders").update({ status: "completed", total_price: calculation.grandTotal }).eq("id", selectedOrder.order_id);
    await supabase.from("tables").update({ status: "available" }).eq("id", selectedOrder.table_id);

    alert("ปิดบิลเรียบร้อย ✅");
    setSelectedOrder(null);
    fetchOccupiedTables();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col md:flex-row gap-6">

      {/* ฝั่งซ้าย: รายชื่อโต๊ะ */}
      <div className="w-full md:w-1/3 print:hidden">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/" className="bg-gray-200 p-2 rounded hover:bg-gray-300"><ArrowLeft /></Link>
          <h1 className="text-2xl font-bold">💵 แคชเชียร์</h1>
        </div>
        <div className="grid gap-3">
          {occupiedTables.length === 0 && <p className="text-gray-500 text-center py-10">ไม่มีลูกค้าในร้าน</p>}
          {occupiedTables.map((t) => (
            <button key={t.id} onClick={() => handleSelectTable(t.id, t.label)} className={`p-4 rounded-xl text-left shadow-sm border-2 transition-all ${selectedOrder?.table_id === t.id ? "border-blue-500 bg-blue-50" : "bg-white border-transparent"}`}>
              <div className="font-bold text-lg">โต๊ะ {t.label}</div>
              <div className="text-red-500 text-sm animate-pulse">● กำลังทาน...</div>
            </button>
          ))}
        </div>
      </div>

      {/* ฝั่งขวา: ใบเสร็จ & ส่วนลด */}
      <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg p-8 relative min-h-[500px] flex flex-col">
        {selectedOrder ? (
          <>
            <div className="flex-1">
              {/* --- พื้นที่ใบเสร็จ (Print Area) --- */}
              <div id="receipt-area" className="max-w-[350px] mx-auto border p-6 text-sm bg-white mb-6 print:border-none print:w-full print:max-w-none print:p-0 print:m-0">
                <div className="text-center mb-4">
                  {/* ✅ ใช้โลโก้และชื่อร้านจาก Database (State) แทนค่าคงที่ */}
                  {shopLogo && <img src={shopLogo} className="h-16 mx-auto mb-2 object-contain" alt="Logo" />}
                  <div className="font-bold text-xl mb-1">{shopName}</div>
                  <div className="text-xs text-gray-500 print:text-black">ใบเสร็จรับเงิน / Receipt</div>
                  <div className="text-xs text-gray-500 mt-1 print:text-black">โต๊ะ: {selectedOrder.table_label} | วันที่: {new Date().toLocaleDateString('th-TH')}</div>
                </div>

                <hr className="my-3 border-dashed border-gray-300" />

                <div className="flex flex-col gap-2">
                  {calculation.itemDetails.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex flex-col w-[65%]">
                        <span>{item.name}</span>
                        {item.note && <span className="text-[10px] text-green-600 font-bold print:text-black">{item.note}</span>}
                        {item.status !== 'served' && <span className="text-[10px] text-orange-500 font-bold print:hidden">(กำลังทำ...)</span>}
                      </div>
                      <div className="w-[10%] text-right text-gray-500">x{item.quantity}</div>
                      <div className="w-[25%] text-right font-medium">{item.finalPrice.toLocaleString()}</div>
                    </div>
                  ))}
                  {calculation.itemDetails.length === 0 && <div className="text-center text-gray-400 italic py-4">-- ยังไม่มีรายการอาหาร --</div>}
                </div>

                <hr className="my-3 border-dashed border-gray-300" />

                <div className="space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>รวมเป็นเงิน</span>
                    <span>{calculation.subtotal.toLocaleString()}</span>
                  </div>

                  {calculation.discount > 0 && (
                    <div className="flex justify-between text-red-500 print:text-black">
                      <span>ส่วนลด ({calculation.discountName})</span>
                      <span>-{calculation.discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-xl mt-2 border-t border-black pt-2">
                    <span>ยอดสุทธิ</span>
                    <span>{calculation.grandTotal.toLocaleString()} ฿</span>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  {calculation.grandTotal > 0 && (
                    <>
                      <p className="text-xs text-gray-500 mb-2">สแกนจ่ายด้วย PromptPay</p>
                      {qrCodeData ? (
                        <img src={qrCodeData} alt="PromptPay QR" className="w-32 h-32 mx-auto border p-2 rounded" />
                      ) : (
                        <p className="text-red-500 text-xs font-bold mt-2 border p-2 rounded bg-red-50">⚠️ กรุณาตั้งค่า PromptPay ในหน้า Admin</p>
                      )}
                    </>
                  )}
                  <p className="text-[10px] text-gray-400 mt-4">ขอบคุณที่ใช้บริการ</p>
                </div>
              </div>
            </div>

            {/* Dropdown ส่วนลด */}
            <div className="print:hidden bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
                <TicketPercent size={20} className="text-orange-500" /> โปรโมชั่นส่วนลดท้ายบิล
              </div>
              <select
                value={selectedDiscountId}
                onChange={(e) => setSelectedDiscountId(Number(e.target.value) || "")}
                className="w-full border p-3 rounded-lg text-gray-700 outline-none focus:ring-2 focus:ring-orange-200 bg-white"
              >
                <option value="">-- ไม่ใช้ส่วนลด --</option>
                {discounts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type === 'percent' ? `ลด ${d.value}%` : `ลด ${d.value} บาท`})
                  </option>
                ))}
              </select>
            </div>

            {selectedOrder.pendingCount > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded mx-auto max-w-md print:hidden flex items-center gap-3">
                <AlertTriangle />
                <div>
                  <p className="font-bold">ยังเช็คบิลไม่ได้!</p>
                  <p className="text-sm">มีอาหารค้างส่ง {selectedOrder.pendingCount} รายการ</p>
                </div>
              </div>
            )}

            {/* ปุ่ม Action */}
            <div className="flex flex-wrap gap-4 justify-center print:hidden pt-4 border-t">
              <button
                onClick={() => window.print()}
                className="bg-gray-800 text-white px-6 py-3 rounded-lg flex gap-2 font-bold hover:bg-black transition-colors"
              >
                <Printer /> พิมพ์ใบเสร็จ
              </button>

              <button
                onClick={handleCloseBill}
                disabled={selectedOrder.pendingCount > 0}
                className={`
                  px-6 py-3 rounded-lg flex gap-2 font-bold transition-all shadow-lg
                  ${selectedOrder.pendingCount > 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : calculation.grandTotal === 0 && calculation.subtotal === 0
                      ? "bg-red-600 text-white hover:bg-red-700 hover:scale-105" // ปุ่มแดง (Void)
                      : "bg-green-600 text-white hover:bg-green-700 hover:scale-105" // ปุ่มเขียว (Pay)
                  }
                `}
              >
                {selectedOrder.pendingCount > 0
                  ? (<><ChefHat /> รอครัวทำอาหาร...</>)
                  : calculation.grandTotal === 0 && calculation.subtotal === 0
                    ? (<><Ban /> ยกเลิกโต๊ะ (Void)</>)
                    : (<><CheckCircle /> รับเงิน {calculation.grandTotal.toLocaleString()} ฿</>)
                }
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[400px]">
            <div className="text-6xl mb-4">👈</div>
            <p>เลือกโต๊ะทางซ้ายเพื่อเช็คบิล</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print { 
          body * { visibility: hidden; } 
          #receipt-area, #receipt-area * { visibility: visible; } 
          #receipt-area { 
            position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; border: none; 
            font-family: 'Courier New', Courier, monospace; 
          } 
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } 
          @page { margin: 0; size: auto; } 
        }
      `}</style>
    </div>
  );
}