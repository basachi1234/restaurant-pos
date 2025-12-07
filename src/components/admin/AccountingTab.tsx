"use client";
import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction } from "@/lib/types";
import { downloadCSV } from "@/lib/utils";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Download, Trash2 } from "lucide-react";

export default function AccountingTab({ transactions, onUpdate }: { transactions: Transaction[], onUpdate: () => void }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ type: 'expense', amount: '', description: '' });

  const stats = useMemo(() => {
    const filtered = transactions.filter(t => t.created_at.startsWith(month));
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, profit: income - expense, list: filtered };
  }, [transactions, month]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || !form.description) return alert("กรอกข้อมูลให้ครบ");
    await supabase.from("transactions").insert({ type: form.type, amount, description: form.description });
    setForm({ type: 'expense', amount: '', description: '' });
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    if (confirm("ลบรายการนี้?")) { await supabase.from("transactions").delete().eq("id", id); onUpdate(); }
  };

  const handleExport = () => {
    if (!stats.list.length) return alert("ไม่มีข้อมูล");
    let csv = "Date,Time,Type,Description,Amount\n";
    stats.list.forEach(t => {
      const d = new Date(t.created_at);
      csv += `${d.toLocaleDateString()},${d.toLocaleTimeString()},${t.type},"${t.description.replace(/"/g,'""')}",${t.type==='expense'?'-':''}${t.amount}\n`;
    });
    downloadCSV(csv, `accounting_${month}.csv`);
  };

  return (
    <div>
      <div className="flex justify-between mb-6"><h2 className="text-xl font-bold flex gap-2"><Wallet className="text-blue-600"/> บัญชีรายเดือน</h2><input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded font-bold cursor-pointer"/></div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 p-5 rounded-xl border border-green-200 flex flex-col items-center"><p className="text-green-600 font-bold flex gap-2 mb-1"><ArrowUpCircle size={16}/> รายรับ</p><h3 className="text-3xl font-black text-green-700">+{stats.income.toLocaleString()}</h3></div>
        <div className="bg-red-50 p-5 rounded-xl border border-red-200 flex flex-col items-center"><p className="text-red-600 font-bold flex gap-2 mb-1"><ArrowDownCircle size={16}/> รายจ่าย</p><h3 className="text-3xl font-black text-red-700">-{stats.expense.toLocaleString()}</h3></div>
        <div className={`p-5 rounded-xl border flex flex-col items-center ${stats.profit>=0?'bg-blue-50 border-blue-200':'bg-orange-50 border-orange-200'}`}><p className="text-gray-600 font-bold mb-1">กำไรสุทธิ</p><h3 className={`text-3xl font-black ${stats.profit>=0?'text-blue-700':'text-orange-700'}`}>{stats.profit>0?'+':''}{stats.profit.toLocaleString()}</h3></div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
        <h3 className="font-bold mb-4">บันทึกรายการเพิ่ม</h3>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-40"><label className="text-xs font-bold text-gray-500 block mb-1">ประเภท</label><select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} className={`w-full border p-2 rounded font-bold ${form.type==='income'?'text-green-600':'text-red-600'}`}><option value="expense">รายจ่าย</option><option value="income">รายรับ</option></select></div>
          <div className="flex-1 w-full"><label className="text-xs font-bold text-gray-500 block mb-1">รายละเอียด</label><input type="text" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} className="w-full border p-2 rounded" placeholder="เช่น ซื้อของ, ค่าไฟ" required/></div>
          <div className="w-full md:w-40"><label className="text-xs font-bold text-gray-500 block mb-1">จำนวนเงิน</label><input type="number" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} className="w-full border p-2 rounded" placeholder="0.00" required/></div>
          <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded font-bold w-full md:w-auto">บันทึก</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center"><span>รายการเดือน {month}</span><button onClick={handleExport} className="text-xs bg-white border px-3 py-1 rounded flex gap-1 hover:bg-gray-100"><Download size={12}/> Export CSV</button></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]"><thead className="bg-gray-50 text-xs uppercase"><tr><th className="p-4">เวลา</th><th className="p-4">รายการ</th><th className="p-4 text-right">ยอดเงิน</th><th className="p-4 text-right">ลบ</th></tr></thead>
          <tbody>{stats.list.map(t=>(<tr key={t.id} className="border-b hover:bg-gray-50"><td className="p-4 text-sm text-gray-500">{new Date(t.created_at).toLocaleString('th-TH')}</td><td className="p-4 font-bold">{t.description}</td><td className={`p-4 text-right font-bold ${t.type==='income'?'text-green-600':'text-red-600'}`}>{t.type==='income'?'+':'-'}{t.amount.toLocaleString()}</td><td className="p-4 text-right"><button onClick={()=>handleDelete(t.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button></td></tr>))}
          {!stats.list.length && <tr><td colSpan={4} className="p-8 text-center text-gray-400">ไม่มีรายการ</td></tr>}</tbody></table>
        </div>
      </div>
    </div>
  );
}