"use client";

import { useEffect, useState, useRef } from "react"; // ✅ เพิ่ม useRef
import { supabase } from "@/lib/supabase";
import { CheckCircle, Clock, ArrowLeft, CheckSquare, Volume2 } from "lucide-react"; // ✅ เพิ่ม Volume2 (ไอคอนลำโพง)
import Link from "next/link";

// โครงสร้างข้อมูลสำหรับแสดงผล
type GroupedOrder = {
    unique_key: string;
    order_id: string;
    table_label: string;
    created_at: string;
    items: {
        id: number;
        menu_name: string;
        quantity: number;
        notes: string | null;
    }[];
};

export default function KitchenPage() {
    const [groupedOrders, setGroupedOrders] = useState<GroupedOrder[]>([]);

    // ✅ 1. สร้าง Reference สำหรับไฟล์เสียง
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetchOrders();

        const channel = supabase
            .channel("realtime-kitchen")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "order_items" },
                (payload) => {
                    fetchOrders();

                    // ✅ 2. เช็คว่าถ้าเป็นรายการใหม่ (INSERT) ให้เล่นเสียง
                    if (payload.eventType === 'INSERT') {
                        playSound();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // ✅ 3. ฟังก์ชันเล่นเสียง (พร้อมกัน Error กรณี Browser Block)
    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0; // เริ่มเล่นใหม่ตั้งแต่ต้น
            audioRef.current.play().catch((err) => {
                console.warn("Audio autoplay blocked:", err);
            });
        }
    };

    const fetchOrders = async () => {
        const { data: rawItems, error } = await supabase
            .from("order_items")
            .select(`
        id, order_id, quantity, notes, created_at,
        menu_items ( name ),
        orders (
          tables ( label )
        )
      `)
            .eq("status", "pending")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Kitchen Error:", error);
            return;
        }

        // --- Logic การ Group แบบแยกบิล (Split Batch) ---
        const groups: GroupedOrder[] = [];
        const lastGroupIndices: Record<string, number> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (rawItems as any[]).forEach((item) => {
            const orderId = item.order_id;
            const itemTime = new Date(item.created_at).getTime();

            let addedToExisting = false;

            if (lastGroupIndices[orderId] !== undefined) {
                const groupIndex = lastGroupIndices[orderId];
                const group = groups[groupIndex];

                const groupTime = new Date(group.created_at).getTime();
                const diffInMinutes = (itemTime - groupTime) / 1000 / 60;

                if (diffInMinutes < 2) {
                    group.items.push({
                        id: item.id,
                        menu_name: item.menu_items?.name || "ไม่ระบุ",
                        quantity: item.quantity,
                        notes: item.notes,
                    });
                    addedToExisting = true;
                }
            }

            if (!addedToExisting) {
                const newGroup: GroupedOrder = {
                    unique_key: `${orderId}_${item.id}`,
                    order_id: orderId,
                    table_label: item.orders?.tables?.label || "?",
                    created_at: item.created_at,
                    items: [{
                        id: item.id,
                        menu_name: item.menu_items?.name || "ไม่ระบุ",
                        quantity: item.quantity,
                        notes: item.notes,
                    }],
                };

                groups.push(newGroup);
                lastGroupIndices[orderId] = groups.length - 1;
            }
        });

        setGroupedOrders(groups);
    };

    const markItemDone = async (itemId: number) => {
        await supabase.from("order_items").update({ status: "served" }).eq("id", itemId);
    };

    const markAllDone = async (items: { id: number }[]) => {
        const ids = items.map((i) => i.id);
        await supabase.from("order_items").update({ status: "served" }).in("id", ids);
    };

    return (
        <div className="min-h-screen bg-gray-900 p-4 text-white">
            {/* ✅ 4. ซ่อน Element Audio ไว้ตรงนี้ (ต้องมีไฟล์ใน folder public) */}
            <audio ref={audioRef} src="/notification.mp3" />

            {/* Header */}
            <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700">
                <Link
                    href="/"
                    className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-gray-200"
                >
                    <ArrowLeft size={20} />
                    กลับหน้าร้าน
                </Link>

                <div className="flex items-center gap-4">
                    {/* ✅ 5. ปุ่มทดสอบเสียง (เผื่อ Browser Block Auto-play) */}
                    <button
                        onClick={playSound}
                        className="bg-gray-700 p-2 rounded-full hover:bg-gray-600 text-yellow-400 transition-all border border-gray-600"
                        title="ทดสอบเสียงเตือน / เปิดใช้งานเสียง"
                    >
                        <Volume2 size={24} />
                    </button>

                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        👨‍🍳 รายการอาหารเข้าครัว <span className="bg-orange-600 text-sm px-2 py-1 rounded-full">{groupedOrders.length} บิล</span>
                    </h1>
                </div>
            </div>

            {/* Grid แสดงกล่องออเดอร์ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groupedOrders.map((group) => (
                    <div
                        key={group.unique_key}
                        className="bg-white text-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col border-t-4 border-orange-500 animate-in fade-in zoom-in duration-300"
                    >
                        <div className="bg-orange-50 p-3 flex justify-between items-center border-b border-orange-100">
                            <span className="text-3xl font-black text-orange-600 tracking-tighter">
                                {group.table_label}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                                <Clock size={12} />
                                {new Date(group.created_at).toLocaleTimeString("th-TH", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>

                        <div className="flex-1 p-0">
                            {group.items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`p-3 flex justify-between items-start border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-bold text-gray-800">{item.menu_name}</span>
                                            <span className="text-xl font-black text-blue-600">x{item.quantity}</span>
                                        </div>
                                        {item.notes && (
                                            <div className="text-red-600 text-sm font-bold mt-1 bg-red-50 inline-block px-2 rounded border border-red-100">
                                                ⚠️ {item.notes}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => markItemDone(item.id)}
                                        className="ml-2 p-2 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-full transition-all"
                                        title="เสร็จรายการนี้"
                                    >
                                        <CheckCircle size={28} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 bg-gray-50 border-t">
                            <button
                                onClick={() => markAllDone(group.items)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
                            >
                                <CheckSquare size={20} />
                                เสร็จทั้งหมด ({group.items.length})
                            </button>
                        </div>
                    </div>
                ))}

                {groupedOrders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center h-[60vh] text-gray-500 opacity-60">
                        <div className="text-8xl mb-4 grayscale">🍵</div>
                        <div className="text-3xl font-light">ยังไม่มีรายการอาหาร</div>
                        <p className="mt-2">พักผ่อนก่อนเชฟ...</p>
                    </div>
                )}
            </div>
        </div>
    );
}