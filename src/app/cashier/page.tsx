"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { 
  ArrowLeft, Printer, CheckCircle, AlertTriangle, ChefHat, 
  TicketPercent, Ban, Coins, QrCode, Banknote, X, History, Calendar 
} from "lucide-react";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

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
  isReprint?: boolean;
  promotion_name?: string;
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

  // Store Info
  const [shopName, setShopName] = useState("กำลังโหลด...");
  const [promptPayId, setPromptPayId] = useState(""); 
  const [shopLogo, setShopLogo] = useState<string | null>(null);

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | "">("");

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer');
  const [cashReceived, setCashReceived] = useState<string>("");
  const [currentReceiptNo, setCurrentReceiptNo] = useState<string>("");

  // History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchStoreInfo();
    fetchOccupiedTables();
    fetchDiscounts();
  }, []);

  useEffect(() => {
    if (showHistoryModal) {
      fetchHistoryOrders();
    }
  }, [showHistoryModal, historyDate]);

  const calculation = useMemo(() => {
    if (!selectedOrder) return { subtotal: 0, discount: 0, grandTotal: 0, discountName: "", itemDetails: [] };

    let subtotal = 0;
    const itemDetails = selectedOrder.items.map(item => {
      let itemTotal = 0;
      let note = "";

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

    let discount = 0;
    let discountName = "";

    if (selectedOrder.isReprint) {
        if (selectedOrder.total < subtotal) {
            discount = subtotal - selectedOrder.total;
            discountName = selectedOrder.promotion_name || "ส่วนลด";
        }
    } else if (selectedDiscountId) {
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

    discount = Math.min(discount, subtotal);
    const grandTotal = Math.max(0, subtotal - discount);

    return { subtotal, discount, grandTotal, discountName, itemDetails };
  }, [selectedOrder, selectedDiscountId, discounts]);

  useEffect(() => {
    const genQR = async () => {
        if (!promptPayId || calculation.grandTotal <= 0) {
            setQrCodeData("");
            return;
        }
        try {
            const payload = generatePayload(promptPayId, { amount: calculation.grandTotal });
            const url = await QRCode.toDataURL(payload);
            setQrCodeData(url);
        } catch (err) { console.error("QR Error", err); }
    };
    genQR();
  }, [calculation.grandTotal, promptPayId]);

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

  const fetchHistoryOrders = async () => {
    const start = new Date(historyDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(historyDate);
    end.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("orders")
      .select("id, receipt_no, total_price, created_at, tables(label)")
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    setHistoryOrders(data || []);
  };

  const handleSelectHistoryOrder = async (orderId: string, receiptNo: string) => {
    const { data: order } = await supabase.from("orders").select(`
      id, total_price, promotion_name,
      tables ( label, id ),
      order_items ( 
        quantity, status, 
        menu_items ( name, price, promotion_qty, promotion_price ) 
      )
    `).eq("id", orderId).single();

    if (!order) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = order.order_items.map((i: any) => ({
      name: i.menu_items?.name || "Unknown",
      price: i.menu_items?.price || 0,
      quantity: i.quantity,
      status: i.status,
      promotion_qty: i.menu_items?.promotion_qty || 0,
      promotion_price: i.menu_items?.promotion_price || 0
    }));

    setSelectedOrder({
      order_id: order.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      table_label: (order.tables as any)?.label || "Takeaway",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      table_id: (order.tables as any)?.id || 0,
      items,
      total: order.total_price,
      pendingCount: 0,
      isReprint: true,
      promotion_name: order.promotion_name
    });

    setCurrentReceiptNo(receiptNo || "-");
    setShowHistoryModal(false);
    setSelectedDiscountId(""); 
    setPaymentMethod('transfer'); 
  };

  const handleSelectTable = async (tableId: number, tableLabel: string) => {
    const { data: order } = await supabase.from("orders").select(`
      id, order_items ( 
        quantity, status, 
        menu_items ( name, price, promotion_qty, promotion_price ) 
      )
    `).eq("table_id", tableId).eq("status", "active").single();

    if (!order) {
        const confirmReset = confirm(`⚠️ ไม่พบข้อมูลบิลของโต๊ะ ${tableLabel} (แต่สถานะโต๊ะขึ้นว่าไม่ว่าง)\n\nระบบตรวจพบข้อมูลผิดปกติ ต้องการ "รีเซ็ตโต๊ะให้ว่าง" เพื่อแก้ไขปัญหาหรือไม่?`);
        if (confirmReset) {
            await supabase.from("tables").update({ status: "available" }).eq("id", tableId);
            alert("รีเซ็ตสถานะโต๊ะเรียบร้อย ✅");
            fetchOccupiedTables();
            setSelectedOrder(null);
        }
        return;
    }

    let pendingCount = 0;
    const itemMap = new Map<string, any>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const now = new Date();
    const label = tableLabel.toUpperCase();
    const isTakeaway = label.startsWith("TA") || label.startsWith("A");
    const numPart = label.replace(/\D/g, '').padStart(2, '0');
    const prefix = isTakeaway ? 'A' : 'T';
    const tempReceiptNo = `REC-${now.getFullYear().toString().substr(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}-${prefix}${numPart}`;
    
    setCurrentReceiptNo(tempReceiptNo);
    setSelectedDiscountId("");
    setCashReceived("");
    setPaymentMethod("transfer"); 
    
    setSelectedOrder({
      order_id: order.id,
      table_label: tableLabel,
      table_id: tableId,
      items,
      total: 0,
      pendingCount,
      isReprint: false
    });
  };

  const changeAmount = useMemo(() => {
    const received = parseFloat(cashReceived);
    if (isNaN(received)) return 0;
    return Math.max(0, received - calculation.grandTotal);
  }, [cashReceived, calculation.grandTotal]);

  const handleVoidBill = async () => {
    if (!selectedOrder) return;
    const confirmVoid = confirm(`⚠️ ยืนยัน "ยกเลิกโต๊ะ (Void)" ใช่หรือไม่?`);
    if (!confirmVoid) return;

    await supabase.from("orders").update({ status: "cancelled", total_price: 0 }).eq("id", selectedOrder.order_id);
    await supabase.from("tables").update({ status: "available" }).eq("id", selectedOrder.table_id);

    alert("ยกเลิกโต๊ะเรียบร้อย 🗑️");
    setSelectedOrder(null);
    fetchOccupiedTables();
  };

  const handleOpenPayment = () => {
    if (!selectedOrder) return;
    if (selectedOrder.pendingCount > 0) return alert("⚠️ อาหารยังไม่ครบ (มีรายการค้างในครัว)");
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;

    if (paymentMethod === 'cash') {
        const received = parseFloat(cashReceived);
        if (isNaN(received) || received < calculation.grandTotal) {
            return alert("❌ ยอดเงินที่รับมาไม่พอ");
        }
    }

    const now = new Date();
    const yy = now.getFullYear().toString().substr(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const hh = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');

    const label = selectedOrder.table_label.toUpperCase();
    const numPart = label.replace(/\D/g, '').padStart(2, '0'); 
    
    let prefix = 'T'; 
    if (label.startsWith("TA") || label.startsWith("A")) prefix = 'A'; 

    const payPart = paymentMethod === 'cash' ? '1' : '2';
    const receiptNo = `${yy}${mm}${dd}${hh}${min}${prefix}${numPart}${payPart}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: any = { 
        status: "completed", 
        total_price: calculation.grandTotal,
        receipt_no: receiptNo,
        payment_method: paymentMethod
    };

    if (calculation.discountName) {
        updatePayload.promotion_name = calculation.discountName;
    }

    await supabase.from("orders").update(updatePayload).eq("id", selectedOrder.order_id);
    await supabase.from("tables").update({ status: "available" }).eq("id", selectedOrder.table_id);

    setCurrentReceiptNo(receiptNo);
    setShowPaymentModal(false);

    setTimeout(() => { window.print(); }, 100);

    setTimeout(() => {
        alert(`✅ ปิดบิลเรียบร้อย!\nเลขที่ใบเสร็จ: ${receiptNo}\nเงินทอน: ${changeAmount.toLocaleString()} ฿`);
        setSelectedOrder(null);
        fetchOccupiedTables();
    }, 1000);
  };

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col md:flex-row gap-6">
      
      {/* Left: Tables & History Button */}
      <div className="w-full md:w-1/3 print:hidden">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-gray-200 p-2 rounded hover:bg-gray-300"><ArrowLeft /></Link>
            <h1 className="text-2xl font-bold">💵 แคชเชียร์</h1>
          </div>
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-700 shadow-sm"
          >
            <History size={16} /> ประวัติบิล
          </button>
        </div>

        <div className="grid gap-3">
          {occupiedTables.length === 0 && <p className="text-gray-500 text-center py-10">ไม่มีลูกค้าในร้าน</p>}
          {occupiedTables.map((t) => (
            <button 
              key={t.id} 
              onClick={() => handleSelectTable(t.id, t.label)} 
              className={`p-4 rounded-xl text-left shadow-sm border-2 transition-all ${selectedOrder?.table_id === t.id && !selectedOrder?.isReprint ? "border-blue-500 bg-blue-50" : "bg-white border-transparent"}`}
            >
              <div className="font-bold text-lg">โต๊ะ {t.label}</div>
              <div className="text-red-500 text-sm animate-pulse">● กำลังทาน...</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Receipt Preview */}
      <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg p-8 relative min-h-[500px] flex flex-col">
        {selectedOrder ? (
          <>
            {selectedOrder.isReprint && (
               <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold print:hidden">
                 โหมดดูย้อนหลัง
               </div>
            )}

            <div className="flex-1">
              <div id="receipt-area" className="max-w-[350px] mx-auto border p-6 text-sm bg-white mb-6 print:border-none print:w-full print:max-w-none print:p-0 print:m-0">
                <div className="text-center mb-4">
                  {shopLogo && <img src={shopLogo} className="h-16 mx-auto mb-2 object-contain" alt="Logo" />}
                  <div className="font-bold text-xl mb-1">{shopName}</div>
                  <div className="text-xs text-gray-500 print:text-black">ใบเสร็จรับเงิน / Receipt</div>
                  {selectedOrder.isReprint && <div className="text-xs font-bold mt-1">(สำเนา / Copy)</div>}
                  <div className="text-xs text-gray-500 mt-1 print:text-black">
                    <div>เลขที่: {currentReceiptNo}</div>
                    <div>โต๊ะ: {selectedOrder.table_label} | วันที่: {new Date().toLocaleDateString('th-TH')}</div>
                  </div>
                </div>

                <hr className="my-3 border-dashed border-gray-300" />

                <div className="flex flex-col gap-2">
                  {calculation.itemDetails.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex flex-col w-[65%]">
                        <span>{item.name}</span>
                        {item.note && <span className="text-[10px] text-green-600 font-bold print:text-black">{item.note}</span>}
                      </div>
                      <div className="w-[10%] text-right text-gray-500">x{item.quantity}</div>
                      <div className="w-[25%] text-right font-medium">{item.finalPrice.toLocaleString()}</div>
                    </div>
                  ))}
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
                  
                  {!selectedOrder.isReprint && paymentMethod === 'cash' && cashReceived && (
                    <div className="text-xs text-gray-500 mt-2 print:block hidden">
                        <div className="flex justify-between"><span>รับเงินสด:</span><span>{parseFloat(cashReceived).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>เงินทอน:</span><span>{changeAmount.toLocaleString()}</span></div>
                    </div>
                  )}
                </div>

                <div className="mt-8 text-center">
                  {calculation.grandTotal > 0 && qrCodeData && paymentMethod !== 'cash' && !selectedOrder.isReprint && (
                    <div className="flex flex-col items-center">
                        <img src={qrCodeData} alt="PromptPay QR" className="w-32 h-32 border p-2 rounded mb-2" />
                        <p className="text-[10px] text-gray-500">สแกนจ่ายได้ทันที</p>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-4">ขอบคุณที่ใช้บริการ</p>
                </div>
              </div>
            </div>

            {!selectedOrder.isReprint && (
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
            )}

            {selectedOrder.pendingCount > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded mx-auto max-w-md print:hidden flex items-center gap-3">
                <AlertTriangle />
                <div>
                  <p className="font-bold">ยังเช็คบิลไม่ได้!</p>
                  <p className="text-sm">มีอาหารค้างส่ง {selectedOrder.pendingCount} รายการ</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 justify-center print:hidden pt-4 border-t">
              <button
                onClick={() => window.print()}
                className="bg-gray-800 text-white px-6 py-3 rounded-lg flex gap-2 font-bold hover:bg-black transition-colors"
              >
                <Printer /> {selectedOrder.isReprint ? "พิมพ์ใบเสร็จซ้ำ" : "พิมพ์ใบเสร็จ (ตัวอย่าง)"}
              </button>

              {!selectedOrder.isReprint && (
                <button
                  onClick={calculation.grandTotal === 0 ? handleVoidBill : handleOpenPayment}
                  disabled={selectedOrder.pendingCount > 0}
                  className={`
                    px-6 py-3 rounded-lg flex gap-2 font-bold transition-all shadow-lg
                    ${selectedOrder.pendingCount > 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : calculation.grandTotal === 0
                        ? "bg-red-600 text-white hover:bg-red-700 hover:scale-105"
                        : "bg-green-600 text-white hover:bg-green-700 hover:scale-105"
                    }
                  `}
                >
                  {selectedOrder.pendingCount > 0
                    ? (<><ChefHat /> รอครัว...</>)
                    : calculation.grandTotal === 0
                      ? (<><Ban /> ยกเลิกโต๊ะ (Void)</>)
                      : (<><CheckCircle /> ชำระเงิน / ปิดบิล</>)
                  }
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[400px]">
            <div className="text-6xl mb-4">👈</div>
            <p>เลือกโต๊ะทางซ้ายเพื่อเช็คบิล</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Coins className="text-yellow-400"/> รับชำระเงิน</h3>
                    <button onClick={() => setShowPaymentModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="p-6">
                    <div className="text-center mb-6">
                        <p className="text-gray-500 mb-1">ยอดสุทธิที่ต้องชำระ</p>
                        <h2 className="text-4xl font-black text-gray-800">{calculation.grandTotal.toLocaleString()} ฿</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={() => setPaymentMethod('transfer')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'transfer' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                            <QrCode size={24}/>
                            <span className="font-bold">โอนจ่าย (QR)</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('cash')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                            <Banknote size={24}/>
                            <span className="font-bold">เงินสด</span>
                        </button>
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-sm font-bold text-gray-700 mb-2">รับเงินมา (บาท)</label>
                            <input 
                                type="number" 
                                value={cashReceived} 
                                onChange={e => setCashReceived(e.target.value)}
                                className="w-full text-3xl font-bold p-3 border rounded-lg text-right focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="0"
                                autoFocus
                            />
                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-200">
                                <span className="text-gray-500 font-bold">เงินทอน</span>
                                <span className={`text-2xl font-black ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {changeAmount.toLocaleString()} ฿
                                </span>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleConfirmPayment}
                        disabled={paymentMethod === 'cash' && (parseFloat(cashReceived) < calculation.grandTotal || !cashReceived)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg disabled:bg-gray-300 disabled:text-gray-500 transition-all"
                    >
                        ยืนยันการรับเงิน
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><History className="text-yellow-400" /> ประวัติการขาย</h3>
              <button onClick={() => setShowHistoryModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="p-4 bg-gray-100 border-b flex items-center gap-3">
               <Calendar className="text-gray-500" />
               <span className="font-bold text-gray-700">เลือกวันที่:</span>
               <input 
                 type="date" 
                 value={historyDate}
                 onChange={(e) => setHistoryDate(e.target.value)}
                 max={maxDate}
                 min={minDate} 
                 className="p-2 border rounded-lg shadow-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
               />
               <span className="text-xs text-gray-400 ml-auto">(ย้อนหลังได้ 30 วัน)</span>
            </div>

            <div className="p-0 overflow-y-auto flex-1">
              {historyOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                    <div className="text-4xl mb-2">📅</div>
                    <p>ไม่พบรายการขายในวันที่เลือก</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-600 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="p-3 border-b text-sm">เวลา</th>
                      <th className="p-3 border-b text-sm">เลขใบเสร็จ</th>
                      <th className="p-3 border-b text-sm">โต๊ะ</th>
                      <th className="p-3 border-b text-right text-sm">ยอดเงิน</th>
                      <th className="p-3 border-b"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {historyOrders.map((h: any) => (
                      <tr key={h.id} className="hover:bg-blue-50 border-b last:border-none transition-colors">
                        <td className="p-3 text-sm text-gray-600">{new Date(h.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</td>
                        <td className="p-3 font-mono text-sm font-bold text-gray-800">{h.receipt_no || "-"}</td>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <td className="p-3 text-sm">{(h.tables as any)?.label || "Takeaway"}</td>
                        <td className="p-3 text-right font-bold text-green-700">{h.total_price.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleSelectHistoryOrder(h.id, h.receipt_no)}
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors"
                          >
                            ดู / พิมพ์
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="bg-gray-50 p-2 text-center text-xs text-gray-400 border-t">
               แสดงรายการขายของวันที่ {new Date(historyDate).toLocaleDateString('th-TH')}
            </div>
          </div>
        </div>
      )}

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