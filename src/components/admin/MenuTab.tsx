"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MenuItem, Category } from "@/lib/types";
import { resizeAndUploadImage } from "@/lib/utils";
import { Search, List, Pencil, Plus, Trash2, Tag, Banknote, X, Image as ImageIcon, Scale } from "lucide-react";

export default function MenuTab({ menuItems, categories, onUpdate }: { menuItems: MenuItem[], categories: Category[], onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: "", price: "", category_id: "", promotion_qty: "", promotion_price: "", is_weight: false });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCat, setShowCat] = useState(false);
  const [catName, setCatName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let url = isEditing?.image_url || null;
      if (imageFile) url = await resizeAndUploadImage(imageFile);
      const payload = {
        name: form.name,
        price: parseFloat(form.price) || 0,
        category_id: parseInt(form.category_id) || null,
        image_url: url,
        promotion_qty: parseInt(form.promotion_qty) || 0,
        promotion_price: parseFloat(form.promotion_price) || 0,
        is_weight: form.is_weight
      };

      if (isEditing) await supabase.from("menu_items").update(payload).eq("id", isEditing.id);
      else await supabase.from("menu_items").insert(payload);

      setForm({ name: "", price: "", category_id: "", promotion_qty: "", promotion_price: "", is_weight: false });
      setImageFile(null); setIsEditing(null); onUpdate();
      alert("บันทึกสำเร็จ!");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      alert(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDel = async (id: number) => { if (confirm("ยืนยันลบ?")) { await supabase.from("menu_items").delete().eq("id", id); onUpdate(); } };
  const handleToggle = async (item: MenuItem) => { await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id); onUpdate(); };
  const handleCatSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (catName) { await supabase.from("categories").insert({ name: catName }); setCatName(""); onUpdate(); } };
  const handleCatDel = async (id: number) => { if (confirm("ลบหมวดหมู่?")) { await supabase.from("categories").delete().eq("id", id); onUpdate(); } };

  const startEdit = (item: MenuItem) => {
    setIsEditing(item);
    setForm({
      name: item.name,
      price: item.price.toString(),
      category_id: item.category_id.toString(),
      promotion_qty: item.promotion_qty ? item.promotion_qty.toString() : "",
      promotion_price: item.promotion_price ? item.promotion_price.toString() : "",
      is_weight: item.is_weight || false
    });
    setImageFile(null); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = menuItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={20} /><input type="text" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" /></div>
        <button onClick={() => setShowCat(!showCat)} className="px-4 border rounded-lg bg-white flex items-center gap-2 text-sm font-bold"><List size={18} /> หมวดหมู่</button>
      </div>

      {showCat && <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex flex-col md:flex-row gap-4 items-start">
        <form onSubmit={handleCatSubmit} className="flex gap-2"><input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="ชื่อหมวดหมู่" className="border p-2 rounded text-sm" required /><button className="bg-blue-600 text-white px-4 rounded text-sm font-bold">เพิ่ม</button></form>
        <div className="flex flex-wrap gap-2">{categories.map(c => <span key={c.id} className="bg-white border px-3 py-1 rounded-full text-xs font-bold flex gap-2 items-center">{c.name}<button onClick={() => handleCatDel(c.id)} className="text-red-400"><X size={12} /></button></span>)}</div>
      </div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
        <h2 className="font-bold text-lg mb-4 flex gap-2">{isEditing ? <Pencil className="text-orange-500" /> : <Plus className="text-blue-500" />}{isEditing ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full"><label className="text-xs font-bold text-gray-500 block mb-1">ชื่ออาหาร</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border p-2 rounded" required /></div>
            <div className="w-full md:w-32"><label className="text-xs font-bold text-gray-500 block mb-1">ราคา</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full border p-2 rounded" required /></div>
            <div className="w-full md:w-48"><label className="text-xs font-bold text-gray-500 block mb-1">หมวดหมู่</label><select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="w-full border p-2 rounded bg-white" required><option value="">-- เลือก --</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border">
            <input type="checkbox" id="is_weight" checked={form.is_weight} onChange={(e) => setForm({ ...form, is_weight: e.target.checked })} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
            <label htmlFor="is_weight" className="text-sm font-bold text-gray-700 flex items-center gap-2 cursor-pointer"><Scale size={18} className="text-orange-500" /> ขายตามน้ำหนัก/ปริมาณ (ให้ระบุจำนวนเองตอนสั่ง)</label>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start bg-orange-50 p-3 rounded border-orange-100">
            <div className="w-full md:w-48"><label className="text-xs font-bold text-orange-700 block mb-1 flex gap-1"><Tag size={12} /> โปร: จำนวน</label><input type="number" value={form.promotion_qty} onChange={e => setForm({ ...form, promotion_qty: e.target.value })} className="w-full border p-2 rounded bg-white text-sm" placeholder="4" /></div>
            <div className="w-full md:w-48"><label className="text-xs font-bold text-orange-700 block mb-1 flex gap-1"><Banknote size={12} /> โปร: ราคาเหมา</label><input type="number" value={form.promotion_price} onChange={e => setForm({ ...form, promotion_price: e.target.value })} className="w-full border p-2 rounded bg-white text-sm" placeholder="299" /></div>
            <div className="flex-1 pt-5 text-xs text-orange-600 italic">* ใส่ให้ครบถ้ามีโปรโมชั่น</div>
          </div>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">รูปภาพ</label><input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setImageFile(e.target.files[0]) }} className="text-sm w-full border p-2 rounded bg-gray-50" /></div>
          <div className="flex gap-2 pt-2"><button disabled={uploading} className={`px-6 py-2 rounded text-white font-bold ${isEditing ? 'bg-orange-500' : 'bg-blue-600'}`}>{uploading ? "..." : "บันทึก"}</button>{isEditing && <button type="button" onClick={() => { setIsEditing(null); setForm({ name: "", price: "", category_id: "", promotion_qty: "", promotion_price: "", is_weight: false }); setImageFile(null); }} className="px-4 bg-gray-200 rounded">ยกเลิก</button>}</div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]"><thead className="bg-gray-50 border-b text-sm"><tr><th className="p-4">รูป</th><th className="p-4">ชื่อ</th><th className="p-4">ราคา</th><th className="p-4">ประเภท</th><th className="p-4">โปรโมชั่น</th><th className="p-4">สถานะ</th><th className="p-4 text-right">จัดการ</th></tr></thead>
            <tbody>{filtered.map(i => (<tr key={i.id} className="border-b hover:bg-gray-50">
              <td className="p-4">{i.image_url ? <img src={i.image_url} className="w-12 h-12 rounded object-cover border" /> : <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300"><ImageIcon size={20} /></div>}</td>
              <td className="p-4 font-bold">{i.name}</td>
              <td className="p-4">{i.price}</td>
              <td className="p-4 text-xs">{i.is_weight ? (<span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold border border-orange-200 w-fit"><Scale size={12} /> ชั่ง นน.</span>) : (<span className="text-gray-400">-</span>)}</td>
              <td className="p-4 text-xs font-bold text-orange-600">{i.promotion_qty > 0 ? `${i.promotion_qty} ชิ้น ${i.promotion_price}฿` : '-'}</td>
              <td className="p-4"><button onClick={() => handleToggle(i)} className={`text-xs px-3 py-1 rounded-full font-bold ${i.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{i.is_available ? 'ขาย' : 'หมด'}</button></td>
              <td className="p-4 text-right"><button onClick={() => startEdit(i)} className="text-blue-600 mr-3"><Pencil size={18} /></button><button onClick={() => handleDel(i.id)} className="text-red-600"><Trash2 size={18} /></button></td>
            </tr>))}</tbody></table>
        </div>
      </div>
    </div>
  );
}