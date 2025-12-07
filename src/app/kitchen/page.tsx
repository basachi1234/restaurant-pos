"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, Clock, ArrowLeft, CheckSquare, Volume2, VolumeX } from "lucide-react"; // ✅ เพิ่ม Icon
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
    const [isSoundOn, setIsSoundOn] = useState(false); // ✅ สถานะเปิด/ปิดเสียง
    const audioRef = useRef<HTMLAudioElement | null>(null); // ✅ ตัวอ้างอิงไฟล์เสียง

    useEffect(() => {
        // ✅ โหลดไฟล์เสียงเตรียมไว้ (ต้องมีไฟล์ public/bell.mp3)
        audioRef.current = new Audio("/bell.mp3");

        fetchOrders();

        const channel = supabase
            .channel("realtime-kitchen")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "order_items" },
                (payload) => {
                    fetchOrders(); // โหลดข้อมูลใหม่

                    // ✅ ถ้ามีการเพิ่มรายการใหม่ (INSERT) และเปิดเสียงอยู่ ให้เล่นเสียง
                    if (payload.eventType === 'INSERT') {
                        playSound();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ✅ ฟังก์ชันเล่นเสียง
    const playSound = () => {
        if (isSoundOn && audioRef.current) {
            audioRef.current.currentTime = 0; // เล่นตั้งแต่ต้น
            audioRef.current.play().catch(err => console.error("Error playing sound:", err));
        }
    };

    // ✅ ฟังก์ชันเปิด/ปิดเสียง (ต้องให้ User กดก่อน Browser ถึงยอมให้มีเสียง)
    const toggleSound = () => {
        if (!isSoundOn) {
            // ลองเล่นเสียงเปล่าๆ เพื่อ unlock autoplay policy
            const dummyAudio = new Audio("/bell.mp3");
            dummyAudio.volume = 0;
            dummyAudio.play().then(() => setIsSoundOn(true)).catch(() => alert("ไม่สามารถเปิดเสียงได้"));
        } else {
            setIsSoundOn(false);
        }
    };

    const fetchOrders = async () => {
        const { data: rawItems, error } = await supabase
            .from("order_items")
            .select(`
                id, order_id, quantity, notes, created_at,
                menu_items ( name ),
                orders ( tables ( label ) )
            `)
            .eq("status", "pending")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Kitchen Error:", error);
            return;
        }

        // --- Logic การ Group (เหมือนเดิม) ---
        const groups: GroupedOrder[] = [];
        const lastGroupIndices: Record<string, number> = {};

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
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Link href="/" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-gray-200">
                        <ArrowLeft size={20} /> <span className="hidden md:inline">กลับ</span>
                    </Link>
                    <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
                        👨‍🍳 ครัว <span className="bg-orange-600 text-sm px-2 py-1 rounded-full">{groupedOrders.length}</span>
                    </h1>
                </div>

                {/* ✅ ปุ่มเปิด/ปิดเสียง */}
                <button
                    onClick={toggleSound}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-md ${isSoundOn ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white animate-pulse'}`}
                >
                    {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    {isSoundOn ? "เปิดเสียงอยู่" : "ปิดเสียง (แตะเพื่อเปิด)"}
                </button>
            </div>

            {/* Grid แสดงกล่องออเดอร์ (เหมือนเดิม) */}
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
                                {new Date(group.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>

                        <div className="flex-1 p-0">
                            {group.items.map((item, index) => (
                                <div key={item.id} className={`p-3 flex justify-between items-start border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-bold text-gray-800">{item.menu_name}</span>
                                            <span className="text-xl font-black text-blue-600">x{item.quantity}</span>
                                        </div>
                                        {item.notes && <div className="text-red-600 text-sm font-bold mt-1 bg-red-50 inline-block px-2 rounded border border-red-100">⚠️ {item.notes}</div>}
                                    </div>
                                    <button onClick={() => markItemDone(item.id)} className="ml-2 p-2 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-full transition-all"><CheckCircle size={28} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 bg-gray-50 border-t">
                            <button onClick={() => markAllDone(group.items)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95">
                                <CheckSquare size={20} /> เสร็จทั้งหมด
                            </button>
                        </div>
                    </div>
                ))}

                {groupedOrders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center h-[60vh] text-gray-500 opacity-60">
                        <div className="text-8xl mb-4 grayscale">🍵</div>
                        <div className="text-3xl font-light">ยังไม่มีรายการอาหาร</div>
                    </div>
                )}
            </div>
        </div>
    );
}