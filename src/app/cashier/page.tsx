"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import Link from "next/link";
import { ArrowLeft, Loader2, History } from "lucide-react";
import { useSearchParams } from "next/navigation";

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

// Component ไส้ใน
function CashierContent() {
  const searchParams = useSearchParams(); 
  
  // Data State
  const [occupiedTables, setOccupiedTables] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [shopName, setShopName] = useState("กำลังโหลด...");
  const [promptPayId, setPromptPayId] = useState("");
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | "">("");

  // ✅ เพิ่มสถานะเช็คว่าจ่ายเงินเสร็จหรือยัง
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);

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

  // Logic ทางลัด
  useEffect(() => {
    const targetTableId = searchParams.get("table_id");
    if (targetTableId && occupiedTables.length > 0) {
      const tableId = Number(targetTableId);
      if (selectedOrder?.table_id === tableId) return;
      const targetTable = occupiedTables.find(t => t.id === tableId);
      if (targetTable) {
        handleSelectTable(targetTable.id, targetTable.label);
      }
    }
  }, [occupiedTables, searchParams]);

  useEffect(() => {
    if (showHistoryModal) fetchHistoryOrders();
  }, [showHistoryModal, historyDate]);

  // Calculation Logic
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
    const tempReceipt = `${now.getFullYear().toString().substr(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${prefix}${numPart}`;

    setCurrentReceiptNo(tempReceipt);
    setSelectedDiscountId(""); 
    setCashReceived(""); 
    setPaymentMethod("transfer");
    setIsPaymentSuccess(false); // ✅ รีเซ็ตสถานะจ่ายเงินเมื่อเลือกโต๊ะใหม่
    
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
    setIsPaymentSuccess(true); // ประวัติคือจ่ายแล้ว
  };

  const handleVoidBill = async () => {
    if (!selectedOrder || !confirm(`⚠️ ยืนยัน "ยกเลิกโต๊ะ (Void)"?`)) return;
    await supabase.from("orders").update({ status: "cancelled", total_price: 0 }).eq("id", selectedOrder.order_id);
    await supabase.from("tables").update({ status: "available" }).eq("id", selectedOrder.table_id);
    alert("ยกเลิกโต๊ะเรียบร้อย 🗑️"); setSelectedOrder(null); fetchOccupiedTables();
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    
    const now = new Date();
    const label = selectedOrder.table_label.toUpperCase();
    const prefix = (label.startsWith("TA") || label.startsWith("A")) ? 'A' : 'T';
    const numPart = label.replace(/\D/g, '').padStart(2, '0');
    const payPart = paymentMethod === 'cash' ? '1' : '2';
    const receiptNo = `${now.getFullYear().toString().substr(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${prefix}${numPart}${payPart}`;

    try {
      const { data, error } = await supabase.rpc('confirm_order_payment', {
        p_order_id: selectedOrder.order_id,
        p_discount_id: selectedDiscountId === "" ? null : Number(selectedDiscountId),
        p_payment_method: paymentMethod,
        p_receipt_no: receiptNo
      });

      if (error) throw error;

      console.log("Payment Completed via RPC:", data);

      setCurrentReceiptNo(receiptNo); 
      setShowPaymentModal(false);
      
      // ✅ แก้ไข: ตัด window.print() อัตโนมัติออก เพื่อป้องกัน iOS ค้าง
      // ✅ แก้ไข: ไม่รีเซ็ต selectedOrder ทันที แต่เปลี่ยนสถานะเป็น "จ่ายแล้ว"
      setIsPaymentSuccess(true);
      fetchOccupiedTables(); // อัปเดตรายการโต๊ะ (โต๊ะนี้จะหายไปจากลิสต์ซ้ายมือ)
      
      alert(`✅ ปิดบิลเรียบร้อย!\n(ยอดสุทธิ: ${data.grand_total.toLocaleString()} ฿)`);

    } catch (err) {
      console.error("RPC Error:", err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert("❌ เกิดข้อผิดพลาด: " + (err as any).message);
    }
  };

  // ✅ ฟังก์ชันใหม่สำหรับปุ่ม "จบรายการ" (กดเมื่อพิมพ์เสร็จแล้ว หรือไม่ต้องการพิมพ์)
  const handleFinishOrder = () => {
    setSelectedOrder(null);
    setIsPaymentSuccess(false);
    fetchOccupiedTables();
  };

  const changeAmount = useMemo(() => Math.max(0, (parseFloat(cashReceived) || 0) - calculation.grandTotal), [cashReceived, calculation.grandTotal]);
  const minDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; }, []);

  return (
    // ✅ 1. เพิ่ม padding รอบนอกเป็น p-4 เพื่อให้ห่างจากขอบมากขึ้น
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col gap-4">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-1 px-1">
        <div className="flex items-center gap-3">
            <Link href="/" className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-50 text-gray-700 transition-colors border border-gray-200">
              <ArrowLeft size={20} />
            </Link>
            <div>
               <h1 className="font-bold text-lg text-gray-800">แคชเชียร์</h1>
               <p className="text-xs text-gray-500">จัดการโต๊ะและชำระเงิน</p>
            </div>
        </div>

        <button 
          onClick={() => setShowHistoryModal(true)}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg shadow-sm hover:bg-blue-50 border border-blue-100 font-bold flex items-center gap-2 transition-colors"
        >
          <History size={20} />
          <span className="hidden sm:inline">ประวัติบิล</span>
        </button>
      </div>

      {/* ✅ 2. Layout หลัก: ใช้ justify-center เพื่อจัดกึ่งกลาง และ gap-3 ให้ชิดกัน */}
      <div className="flex flex-col md:flex-row gap-3 items-start flex-1 justify-center">
          
          {/* ✅ 3. รายการโต๊ะ: กำหนดความกว้าง Fixed 450px เพื่อให้คงที่และดูสมดุลกับใบเสร็จ */}
          <div className="w-full md:w-[450px] flex-shrink-0">
            <TableList 
              tables={occupiedTables} selectedTableId={selectedOrder?.table_id} isReprintMode={selectedOrder?.isReprint}
              onSelectTable={handleSelectTable} 
            />
          </div>

          {/* ✅ 4. ใบเสร็จ: ใช้ w-auto เพื่อให้ขนาดเป็นไปตามที่กำหนดใน ReceiptPreview (300px) */}
          <div className="w-full md:w-auto flex-shrink-0">
            <ReceiptPreview 
              selectedOrder={selectedOrder} calculation={calculation} shopName={shopName} shopLogo={shopLogo}
              currentReceiptNo={currentReceiptNo} qrCodeData={qrCodeData} paymentMethod={paymentMethod}
              cashReceived={cashReceived} changeAmount={changeAmount} discounts={discounts}
              selectedDiscountId={selectedDiscountId} onSelectDiscount={setSelectedDiscountId}
              onPrint={() => window.print()} onVoid={handleVoidBill} onOpenPayment={() => setShowPaymentModal(true)}
              
              // ✅ ส่ง Props ใหม่ไปให้ ReceiptPreview
              isPaymentSuccess={isPaymentSuccess}
              onFinishOrder={handleFinishOrder}
            />
          </div>

      </div>

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
      
      {/* ✅ ปรับ CSS Print: ไม่ลบขอบกระดาษ (ลบ margin: 0 ของ @page ออก) แต่ยังคง fix position เพื่อให้ใบเสร็จอยู่หน้าแรกเสมอ */}
      <style jsx global>{`
        @media print {
          @page {
            /* ❌ เอา margin: 0; ออก เพื่อให้เครื่องพิมพ์ใช้ขอบ Default */
            size: auto;
          }
          
          html, body {
            height: auto;
            overflow: visible;
            background: white;
            /* ❌ เอา margin: 0 !important; ของ body ออกด้วยก็ได้ครับ ถ้าอยากให้มีขอบ */
            margin: 0; 
            padding: 0;
          }

          body * {
            visibility: hidden;
          }

          #receipt-area, #receipt-area * {
            visibility: visible;
          }

          #receipt-area {
            position: fixed; /* ยังคงใช้ fixed เพื่อให้เกาะมุมซ้ายบนของ "พื้นที่พิมพ์" */
            left: 0;
            top: 0;
            width: 100%;
            z-index: 9999;
            /* เอา margin ออก ให้เป็นไปตาม @page */
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function CashierPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-2 text-blue-600">
           <Loader2 className="animate-spin" size={48} />
           <p className="font-bold">กำลังโหลดข้อมูลแคชเชียร์...</p>
        </div>
      </div>
    }>
      <CashierContent />
    </Suspense>
  );
}