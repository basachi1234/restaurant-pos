"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/lib/types";
import { Users, UserPlus, KeyRound, Pencil, Trash2 } from "lucide-react";

export default function StaffTab({ users, onUpdate }: { users: UserProfile[], onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ name: "", pin: "", role: "staff" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, pin: form.pin, role: form.role };
    if (isEditing) await supabase.from("users").update(payload).eq("id", isEditing.id);
    else await supabase.from("users").insert(payload);
    setForm({ name: "", pin: "", role: "staff" }); setIsEditing(null); onUpdate();
  };

  const handleDelete = async (id: number) => { if (confirm("ลบ?")) { await supabase.from("users").delete().eq("id", id); onUpdate(); } };
  const startEdit = (u: UserProfile) => { setIsEditing(u); setForm({ name: u.name, pin: u.pin, role: u.role }); };

  return (
    <div>
      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">{isEditing?<KeyRound className="text-orange-500"/>:<UserPlus className="text-purple-500"/>}{isEditing?"แก้ไขพนักงาน":"เพิ่มพนักงานใหม่"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full"><label className="text-xs font-bold text-gray-500 block mb-1">ชื่อ</label><input type="text" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="w-full border p-2 rounded" required/></div>
          <div className="w-full md:w-40"><label className="text-xs font-bold text-gray-500 block mb-1">PIN (4-6 หลัก)</label><input type="text" value={form.pin} onChange={e=>setForm({...form, pin:e.target.value})} className="w-full border p-2 rounded text-center font-bold" required maxLength={6}/></div>
          <div className="w-full md:w-40"><label className="text-xs font-bold text-gray-500 block mb-1">ตำแหน่ง</label><select value={form.role} onChange={e=>setForm({...form, role:e.target.value})} className="w-full border p-2 rounded bg-white"><option value="staff">พนักงาน</option><option value="owner">เจ้าของ</option></select></div>
          <div className="flex gap-2 w-full md:w-auto"><button className={`flex-1 px-6 py-2 rounded text-white font-bold ${isEditing?'bg-orange-500':'bg-purple-600'}`}>{isEditing?'บันทึก':'เพิ่ม'}</button>{isEditing&&<button type="button" onClick={()=>{setIsEditing(null); setForm({name:"",pin:"",role:"staff"})}} className="px-4 bg-gray-200 rounded">ยกเลิก</button>}</div>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-left min-w-[600px]"><thead className="bg-gray-50 border-b"><tr><th className="p-4">ชื่อ</th><th className="p-4">ตำแหน่ง</th><th className="p-4">PIN</th><th className="p-4 text-right">จัดการ</th></tr></thead>
        <tbody>{users.map(u=>(<tr key={u.id} className="border-b hover:bg-gray-50"><td className="p-4 font-bold">{u.name}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role==='owner'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`}>{u.role}</span></td><td className="p-4 font-mono text-gray-400">••••</td><td className="p-4 text-right"><button onClick={()=>startEdit(u)} className="text-blue-600 mr-3"><Pencil size={18}/></button><button onClick={()=>handleDelete(u.id)} className="text-red-600"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}