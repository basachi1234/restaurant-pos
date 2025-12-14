"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation"; // ✅ 1. เพิ่ม import นี้

// Import Components
import TableList from "@/components/cashier/TableList";
import ReceiptPreview from "@/components/cashier/ReceiptPreview";
import PaymentModal from "@/components/cashier/PaymentModal";
import HistoryModal from "@/components/cashier/HistoryModal";

// Types
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
  const searchParams = useSearchParams(); // ✅ 2. อ่านค่าจาก URL Params
  
  // Data State
  const [occupiedTables, setOccupiedTables] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [shopName, setShopName] = useState("กำลังโหลด...");
  const [promptPayId, setPromptPayId] = useState("");
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | "">("");

  // Payment State
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

  // ✅ 3. เพิ่ม Logic ทางลัด: ถ้าโหลดโต๊ะเสร็จแล้ว และมี table_id ใน URL ให้เปิดโต๊ะนั้นเลยอัตโนมัติ
  useEffect(() => {
    const targetTableId = searchParams.get("table_id");
    
    // ทำงานเมื่อมี occupiedTables (โหลดเสร็จแล้ว) และมี table_id ส่งมา
    if (targetTableId && occupiedTables.length > 0) {
      const tableId = Number(targetTableId);
      
      // ป้องกันการรีโหลดซ้ำถ้ารายการนั้นถูกเลือกอยู่แล้ว
      if (selectedOrder?.table_id === tableId) return;

      // หาโต๊ะที่ตรงกับ ID
      const targetTable = occupiedTables.find(t => t.id === tableId);
      
      if (targetTable) {
        // จำลองการกดเลือกโต๊ะ
        handleSelectTable(targetTable.id, targetTable.label);
        
        // (Optional) ล้างค่า URL เพื่อความสวยงาม และไม่ให้กวนใจเวลากด Refresh
        window.history.replaceState(null, "", "/cashier"); 
      }
    }
  }, [occupiedTables, searchParams]); // dependency array ต้องใส่ให้ครบเพื่อให้ effect ทำงานถูกจังหวะ

  useEffect(() => {
    if (showHistoryModal) fetchHistoryOrders();
  }, [showHistoryModal, historyDate]);

  // Calculation Logic (เก็บไว้สำหรับแสดงผล Preview เท่านั้น)
  const calculation = useMemo(() => {
    if (!selectedOrder) return { subtotal: 0, discount: 0, grandTotal: 0, discountName: "", itemDetails: [] };

    let subtotal = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemDetails = selectedOrder.items.map((item: any) => {
      let itemTotal = 0;
      let note = "";
      if (item.promotion_qty > 0 && item.promotion_price > 0 && item.quantity >= item.promotion_qty) {
        const bundles = Math.floor(item.quantity / item.promotion_qty);
        const remainder = item.quantity % item.promotion_qty;
        itemTotal = (bundles * item.promotion_price) + (remainder * item.price);
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
        discount = discountObj.type === 'percent' ? subtotal * (discountObj.value / 100) : discountObj.value;
      }
    }

    discount = Math.min(discount, subtotal);
    const grandTotal = Math.max(0, subtotal - discount);

    return { subtotal, discount, grandTotal, discountName, itemDetails };
  }, [selectedOrder, selectedDiscountId, discounts]);

  // QR Code Generation
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

  // Data Fetching Functions
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
    const start = new Date(historyDate); start.setHours(0, 0, 0, 0);
    const end = new Date(historyDate); end.setHours(23, 59, 59, 999);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await supabase.from("orders").select("id, receipt_no, total_price, created_at, tables(label)")
      .eq("status", "completed").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    setHistoryOrders(data || []);
  };

  // Handlers
  const handleSelectTable = async (tableId: number, tableLabel: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await supabase.from("orders").select(`id, order_items ( quantity, status, menu_items ( name, price, promotion_qty, promotion_price ) )`).eq("table_id", tableId).eq("status", "active").single();
    if (!order) {
      if (confirm(`⚠️ โต๊ะ ${tableLabel} สถานะไม่ว่างแต่ไม่พบออเดอร์ ต้องการรีเซ็ต?`)) {
        await supabase.from("tables").update({ status: "available" }).eq("id", tableId);
        fetchOccupiedTables(); setSelectedOrder(null);
      }
      return;
    }

    const itemMap = new Map<string, any>();
    let pendingCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    order.order_items.forEach((i: any) => {
      if (i.status !== 'served') pendingCount++;
      const name = i.menu_items.name;
      if (itemMap.has(name)) {
        itemMap.get(name).quantity += i.quantity;
      } else {
        itemMap.set(name, {
          name, price: i.menu_items.price, quantity: i.quantity, status: i.status,
          promotion_qty: i.menu_items.promotion_qty || 0, promotion_price: i.menu_items.promotion_price || 0
        });
      }
    });

    const now = new Date();
    const label = tableLabel.toUpperCase();
    const prefix = (label.startsWith("TA") || label.startsWith("A")) ? 'A' : 'T';
    const numPart = label.replace(/\D/g, '').padStart(2, '0');
    const tempReceipt = `REC-${now.getFullYear().toString().substr(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}-${prefix}${numPart}`;

    setCurrentReceiptNo(tempReceipt);
    setSelectedDiscountId(""); setCashReceived(""); setPaymentMethod("transfer");
    setSelectedOrder({
      order_id: order.id, table_label: tableLabel, table_id: tableId,
      items: Array.from(itemMap.values()), total: 0, pendingCount, isReprint: false
    });
  };

  const handleSelectHistoryOrder = async (orderId: string, receiptNo: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await supabase.from("orders").select(`id, total_price, promotion_name, tables ( label, id ), order_items ( quantity, status, menu_items ( name, price, promotion_qty, promotion_price ) )`).eq("id", orderId).single();
    if (!order) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = order.order_items.map((i: any) => ({
      name: i.menu_items?.name || "Unknown", price: i.menu_items?.price || 0, quantity: i.quantity, status: i.status,
      promotion_qty: i.menu_items?.promotion_qty || 0, promotion_price: i.menu_items?.promotion_price || 0
    }));

    setSelectedOrder({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      order_id: order.id, table_label: (order.tables as any)?.label || "Takeaway", table_id: (order.tables as any)?.id || 0,
      items, total: order.total_price, pendingCount: 0, isReprint: true, promotion_name: order.promotion_name
    });
    setCurrentReceiptNo(receiptNo || "-");
    setShowHistoryModal(false); setSelectedDiscountId(""); setPaymentMethod('transfer');
  };

  const handleVoidBill = async () => {
    if (!selectedOrder || !confirm(`⚠️ ยืนยัน "ยกเลิกโต๊ะ (Void)"?`)) return;
    await supabase.from("orders").update({ status: "cancelled", total_price: 0 }).eq("id", selectedOrder.order_id);
    await supabase.from("tables").update({ status: "available" }).eq("id", selectedOrder.table_id);
    alert("ยกเลิกโต๊ะเรียบร้อย 🗑️"); setSelectedOrder(null); fetchOccupiedTables();
  };

  // ✅ [Updated] ฟังก์ชันยืนยันการจ่ายเงิน (ใช้ RPC)
  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    
    // 1. สร้างเลขที่ใบเสร็จ
    const now = new Date();
    const label = selectedOrder.table_label.toUpperCase();
    const prefix = (label.startsWith("TA") || label.startsWith("A")) ? 'A' : 'T';
    const numPart = label.replace(/\D/g, '').padStart(2, '0');
    const payPart = paymentMethod === 'cash' ? '1' : '2';
    const receiptNo = `${now.getFullYear().toString().substr(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${prefix}${numPart}${payPart}`;

    try {
      // 2. เรียกใช้ RPC Function บน Supabase (Secure & Transactional)
      const { data, error } = await supabase.rpc('confirm_order_payment', {
        p_order_id: selectedOrder.order_id,
        p_discount_id: selectedDiscountId === "" ? null : Number(selectedDiscountId),
        p_payment_method: paymentMethod,
        p_receipt_no: receiptNo
      });

      if (error) throw error;

      console.log("Payment Completed via RPC:", data);

      // 3. อัปเดต UI หลังจากทำรายการสำเร็จ
      setCurrentReceiptNo(receiptNo); 
      setShowPaymentModal(false);
      
      // 4. สั่งพิมพ์ใบเสร็จอัตโนมัติ และรีเซ็ตหน้าจอ
      setTimeout(() => { window.print(); }, 100);
      setTimeout(() => { 
        // แสดงยอดเงินที่ Server คำนวณได้จริงเพื่อยืนยันกับผู้ใช้
        alert(`✅ ปิดบิลเรียบร้อย! (ยอดสุทธิ: ${data.grand_total.toLocaleString()} ฿)`); 
        setSelectedOrder(null); 
        fetchOccupiedTables(); 
      }, 1000);

    } catch (err) {
      console.error("RPC Error:", err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert("❌ เกิดข้อผิดพลาด: " + (err as any).message);
    }
  };

  const changeAmount = useMemo(() => Math.max(0, (parseFloat(cashReceived) || 0) - calculation.grandTotal), [cashReceived, calculation.grandTotal]);
  const minDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col md:flex-row gap-6">
      <div className="md:hidden mb-4"><Link href="/" className="bg-gray-200 p-2 rounded"><ArrowLeft /></Link></div>
      
      <TableList 
        tables={occupiedTables} selectedTableId={selectedOrder?.table_id} isReprintMode={selectedOrder?.isReprint}
        onSelectTable={handleSelectTable} onOpenHistory={() => setShowHistoryModal(true)}
      />

      <ReceiptPreview 
        selectedOrder={selectedOrder} calculation={calculation} shopName={shopName} shopLogo={shopLogo}
        currentReceiptNo={currentReceiptNo} qrCodeData={qrCodeData} paymentMethod={paymentMethod}
        cashReceived={cashReceived} changeAmount={changeAmount} discounts={discounts}
        selectedDiscountId={selectedDiscountId} onSelectDiscount={setSelectedDiscountId}
        onPrint={() => window.print()} onVoid={handleVoidBill} onOpenPayment={() => setShowPaymentModal(true)}
      />

      {showPaymentModal && (
        <PaymentModal 
          totalAmount={calculation.grandTotal} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
          cashReceived={cashReceived} setCashReceived={setCashReceived} changeAmount={changeAmount}
          onConfirm={handleConfirmPayment} onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showHistoryModal && (
        <HistoryModal 
          orders={historyOrders} onSelectOrder={handleSelectHistoryOrder} onClose={() => setShowHistoryModal(false)}
          date={historyDate} setDate={setHistoryDate} minDate={minDate} maxDate={new Date().toISOString().split('T')[0]}
        />
      )}
      
      <style jsx global>{`@media print { body * { visibility: hidden; } #receipt-area, #receipt-area * { visibility: visible; } #receipt-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; border: none; font-family: 'Courier New', Courier, monospace; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } @page { margin: 0; size: auto; } }`}</style>
    </div>
  );
}