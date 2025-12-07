"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Discount } from "@/lib/types";
import { TicketPercent, Trash2 } from "lucide-react";

export default function DiscountsTab({ discounts, onUpdate }: { discounts: Discount[], onUpdate: () => void }) {
  const [form, setForm] = useState({ name: "", type: "percent", value: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(form.value);
    if (!form.name || !val) return;
    await supabase.from("discounts").insert({ name: form.name, type: form.type, value: val });
    setForm({ name: "", type: "percent", value: "" }); onUpdate();
  };
  const handleDelete = async (id: number) => { if(confirm("ลบ?")) { await supabase.from("discounts").delete().eq("id", id); onUpdate(); }};

  return (
    <div>
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-700"><TicketPercent className="text-orange-500"/> เพิ่มโปรโมชั่น / ส่วนลด</h2>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
           <div className="flex-1 w-full"><label className="text-xs font-bold text-gray-500 block mb-1">ชื่อส่วนลด</label><input type="text" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="w-full border p-2 rounded" required placeholder="เช่น สมาชิก"/></div>
           <div className="w-full md:w-32"><label className="text-xs font-bold text-gray-500 block mb-1">ประเภท</label><select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} className="w-full border p-2 rounded bg-white"><option value="percent">% เปอร์เซ็นต์</option><option value="amount">฿ บาท</option></select></div>
           <div className="w-full md:w-32"><label className="text-xs font-bold text-gray-500 block mb-1">มูลค่า</label><input type="number" value={form.value} onChange={e=>setForm({...form, value:e.target.value})} className="w-full border p-2 rounded" required placeholder="10"/></div>
           <button className="bg-orange-500 text-white px-6 py-2 rounded font-bold w-full md:w-auto">เพิ่ม</button>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-left min-w-[600px]"><thead className="bg-gray-50 border-b"><tr><th className="p-4">ชื่อ</th><th className="p-4 text-center">ประเภท</th><th className="p-4 text-right">มูลค่า</th><th className="p-4 text-right">จัดการ</th></tr></thead>
        <tbody>{discounts.map(d=>(<tr key={d.id} className="border-b hover:bg-gray-50"><td className="p-4 font-bold">{d.name}</td><td className="p-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${d.type==='percent'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700'}`}>{d.type==='percent'?'เปอร์เซ็นต์':'จำนวนเงิน'}</span></td><td className="p-4 text-right font-bold">{d.value} {d.type==='percent'?'%':'฿'}</td><td className="p-4 text-right"><button onClick={()=>handleDelete(d.id)} className="text-red-600"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}