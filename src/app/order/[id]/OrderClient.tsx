"use client";

import { useState, useMemo, useCallback, memo, useEffect, useRef } from "react"; // ✅ 1. เพิ่ม useRef
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, ArrowLeft, Plus, Minus, Receipt, X, Clock, Trash2, MessageSquare, Scale } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MenuItem } from "@/lib/types";

// --- Helper: อ่าน Cookie ---
const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : undefined;
};

type CartItem = MenuItem & { quantity: number; note: string };

type OrderHistoryItem = {
  id: number;
  quantity: number;
  status: string;
  notes: string | null;
  created_at: string;
  menu_items: { name: string; price: number };
};

// --- Sub-Component: การ์ดเมนู ---
const MenuItemCard = memo(({
  item,
  qty,
  note,
  onAdd,
  onRemove,
  onUpdateNote,
  onUpdateQty
}: {
  item: MenuItem;
  qty: number;
  note: string;
  onAdd: (item: MenuItem) => void;
  onRemove: (itemId: number) => void;
  onUpdateNote: (itemId: number, note: string) => void;
  onUpdateQty: (itemId: number, newQty: number) => void;
}) => {

  const handleEditNote = () => {
    const newNote = prompt(`ระบุหมายเหตุสำหรับ "${item.name}" \n(เช่น เผ็ดน้อย, ไม่ใส่ผัก)`, note);
    if (newNote !== null) {
      onUpdateNote(item.id, newNote);
    }
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow flex gap-4 items-start transition-all ${qty > 0 ? 'border-2 border-blue-500 bg-blue-50' : ''}`}>
      <div className="flex-shrink-0 relative w-20 h-20 mt-1">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="80px"
            className="object-cover rounded-lg bg-gray-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">No Image</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-800 text-lg truncate">{item.name}</h3>
        <div className="flex items-center gap-2">
          <p className="text-gray-500 font-medium">{item.price} ฿ {item.is_weight ? '/ หน่วย' : ''}</p>
          {item.is_weight && (
            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-200">
              <Scale size={10} /> ชั่ง นน.
            </span>
          )}
        </div>

        {qty > 0 && (
          <button
            onClick={handleEditNote}
            className={`mt-2 text-xs flex items-center gap-1 px-2 py-1 rounded-md border transition-colors ${note ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
          >
            <MessageSquare size={12} />
            {note ? <span className="font-bold truncate max-w-[120px]">{note}</span> : "เพิ่มหมายเหตุ"}
          </button>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 mt-1">
        {item.is_weight ? (
          qty === 0 ? (
            <button
              onClick={() => {
                const val = prompt(`ระบุน้ำหนัก/จำนวน ของ "${item.name}"`);
                if (val) {
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > 0) onUpdateQty(item.id, num);
                }
              }}
              className="bg-orange-500 text-white px-3 py-2 rounded-lg font-bold shadow-sm hover:bg-orange-600 flex items-center gap-1 text-sm"
            >
              <Scale size={16} /> ระบุจำนวน
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={qty}
                step="0.1"
                onChange={(e) => onUpdateQty(item.id, parseFloat(e.target.value) || 0)}
                className="w-16 border-2 border-blue-500 rounded-lg p-1 text-center font-bold text-lg outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
              <button onClick={() => onRemove(item.id)} className="p-2 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors"><Trash2 size={18} /></button>
            </div>
          )
        ) : (
          qty === 0 ? (
            <button
              onClick={() => onAdd(item)}
              className="bg-blue-100 text-blue-600 px-4 py-2 rounded-full font-bold shadow-sm hover:bg-blue-200 flex items-center gap-1"
            >
              เพิ่ม <Plus size={16} />
            </button>
          ) : (
            <div className="flex items-center bg-white rounded-full shadow-md border overflow-hidden">
              <button onClick={() => onRemove(item.id)} className="p-3 text-red-500 hover:bg-red-50 active:bg-red-100"><Minus size={18} /></button>
              <span className="w-8 text-center font-bold text-lg text-gray-800">{qty}</span>
              <button onClick={() => onAdd(item)} className="p-3 text-green-600 hover:bg-green-50 active:bg-green-100"><Plus size={18} /></button>
            </div>
          )
        )}
      </div>
    </div>
  );
});

MenuItemCard.displayName = "MenuItemCard";

// --- Main Component ---
export default function OrderClient({
  initialMenuItems,
  orderId,
  tableLabel
}: {
  initialMenuItems: MenuItem[],
  orderId: string,
  tableLabel: string
}) {
  const router = useRouter();

  const [menuItems] = useState<MenuItem[]>(initialMenuItems);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<OrderHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [userRole, setUserRole] = useState<string | undefined>(undefined);

  // ✅ 2. สร้าง Reference สำหรับไฟล์เสียง
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setUserRole(getCookie('user_role'));
  }, []);

  // --- Logic ---
  const cartQtyMap = useMemo(() => {
    return cart.reduce((acc, item) => {
      acc[item.id] = item.quantity;
      return acc;
    }, {} as Record<number, number>);
  }, [cart]);

  const cartNoteMap = useMemo(() => {
    return cart.reduce((acc, item) => {
      acc[item.id] = item.note;
      return acc;
    }, {} as Record<number, string>);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((s, i) => s + (i.is_weight ? 1 : i.quantity), 0);
  }, [cart]);

  // ✅ 3. ฟังก์ชันเล่นเสียง
  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.warn("Audio blocked:", err));
    }
  };

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1, note: "" }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (!existing || existing.quantity <= 1) { // ถ้า <= 1 ให้ลบออก
        return prev.filter((i) => i.id !== itemId);
      }
      return prev.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  }, []);

  const updateQtyDirectly = useCallback((itemId: number, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== itemId));
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (!existing) {
        const itemInfo = menuItems.find(m => m.id === itemId);
        if (itemInfo) return [...prev, { ...itemInfo, quantity: newQty, note: "" }];
        return prev;
      }
      return prev.map((i) => i.id === itemId ? { ...i, quantity: newQty } : i);
    });
  }, [menuItems]);

  const updateNote = useCallback((itemId: number, note: string) => {
    setCart((prev) => {
      return prev.map((i) =>
        i.id === itemId ? { ...i, note: note } : i
      );
    });
  }, []);

  const submitOrder = async () => {
    const { data: settings } = await supabase.from("store_settings").select("is_open").eq("id", 1).single();
    if (settings && settings.is_open === false) {
      alert("⛔ ร้านปิดรับออเดอร์ชั่วคราวครับ");
      return;
    }

    if (cart.length === 0) return;
    setIsSubmitting(true);

    const orderItemsData = cart.map((item) => ({
      order_id: orderId,
      menu_item_id: item.id,
      quantity: item.quantity,
      notes: item.note,
      status: "pending",
    }));

    try {
      const { error } = await supabase.from("order_items").insert(orderItemsData);
      if (error) throw error;

      // ✅ 4. เล่นเสียงเมื่อส่งสำเร็จ
      playSound();

      alert("ส่งออเดอร์เรียบร้อย! ✅");
      setCart([]);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchOrderHistory = async () => {
    const { data } = await supabase
      .from("order_items")
      .select(`id, quantity, status, notes, created_at, menu_items ( name, price )`)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (data) {
      const items = data as any[];
      setHistoryItems(items);
      setHistoryTotal(items.reduce((sum, i) => sum + (i.menu_items.price * i.quantity), 0));
      setShowHistory(true);
    }
  };

  const handleDeleteHistoryItem = async (itemId: number, status: string, itemName: string) => {
    const isServed = status === 'served';

    if (isServed && userRole === 'staff') {
      alert("⛔ ขออภัย: พนักงานไม่สามารถลบรายการที่ 'เสิร์ฟแล้ว' ได้\n(กรุณาแจ้ง Owner หากต้องการ Void บิล)");
      return;
    }

    const message = isServed
      ? `⚠️ รายการ "${itemName}" เสิร์ฟแล้ว!\nต้องการลบออกจากบิลใช่หรือไม่? (Void)`
      : `ยืนยันการยกเลิกเมนู "${itemName}" ?\n(รายการจะหายไปจากหน้าจอครัวทันที)`;

    if (!confirm(message)) return;

    try {
      const { error } = await supabase.from("order_items").delete().eq("id", itemId);
      if (error) throw error;
      fetchOrderHistory();
    } catch (err) {
      console.error(err);
      alert("ลบรายการไม่สำเร็จ");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ✅ 5. ฝัง Element Audio ไว้ (ใช้ไฟล์เดียวกับครัว หรือจะเปลี่ยนไฟล์ใหม่ก็ได้) */}
      <audio ref={audioRef} src="/notification.mp3" />

      <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
        <button onClick={() => router.push("/")} className="p-2 text-gray-600 bg-gray-100 rounded-full">
          <ArrowLeft />
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {tableLabel ? `โต๊ะ ${tableLabel}` : 'Order'}
        </h1>
        <button onClick={fetchOrderHistory} className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-yellow-200">
          <Receipt size={16} /> ประวัติ
        </button>
      </div>

      <div className="p-4 grid gap-4">
        {menuItems.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            qty={cartQtyMap[item.id] || 0}
            note={cartNoteMap[item.id] || ""}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onUpdateNote={updateNote}
            onUpdateQty={updateQtyDirectly}
          />
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 rounded-t-2xl z-20 border-t">
          <div className="flex justify-between items-center mb-4 px-2">
            <div className="flex items-center gap-2 text-gray-700">
              <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">{totalItems} รายการ</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{totalAmount.toLocaleString()} ฿</span>
          </div>

          <button
            onClick={submitOrder}
            disabled={isSubmitting}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-xl shadow-lg flex items-center justify-center gap-2 hover:bg-green-700 disabled:bg-gray-400"
          >
            {isSubmitting ? "กำลังส่ง..." : "✅ ยืนยันสั่งอาหาร"}
          </button>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                  <Receipt className="text-yellow-600" /> รายการที่สั่ง
                </h2>
                <p className="text-xs text-gray-500">{historyItems.length} รายการ</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto p-4 flex-1 space-y-3">
              {historyItems.length === 0 ? (
                <p className="text-center text-gray-400 py-10">ว่างเปล่า</p>
              ) : (
                historyItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 text-lg">
                        {item.menu_items.name} <span className="text-blue-600">x{item.quantity}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Clock size={12} /> {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${item.status === 'served' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item.status === 'served' ? 'เสิร์ฟแล้ว' : 'กำลังทำ'}
                        </span>
                      </div>
                      {item.notes && (
                        <div className="mt-1 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded inline-block">
                          📝 {item.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="font-bold text-gray-600">{(item.menu_items.price * item.quantity).toLocaleString()}</div>
                      <button
                        onClick={() => handleDeleteHistoryItem(item.id, item.status, item.menu_items.name)}
                        className={`p-2 rounded-full transition-colors ${item.status === 'served' && userRole === 'staff'
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        title="ยกเลิก/ลบรายการ"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-gray-100 rounded-b-2xl border-t">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>รวม (โดยประมาณ)</span>
                <span className="text-blue-600">{historyTotal.toLocaleString()} ฿</span>
              </div>
              <button onClick={() => setShowHistory(false)} className="w-full mt-4 bg-gray-800 text-white py-3 rounded-xl font-bold">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}