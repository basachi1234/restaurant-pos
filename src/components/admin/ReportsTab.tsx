"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Download, FileText } from "lucide-react";
import { downloadCSV } from "@/lib/utils";

type ReportOrder = {
  id: string;
  receipt_no: string | null;    // ✅ เพิ่มกลับเข้ามา
  promotion_name: string | null; // ✅ เพิ่มเข้ามา
  created_at: string;
  total_price: number;
  tables: { label: string } | null;
  order_items: { quantity: number; menu_items: { name: string } | null }[];
};

export default function ReportsTab() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<ReportOrder[]>([]);
  const [summary, setSummary] = useState({ sales: 0, bills: 0 });

  useEffect(() => { fetchReport(reportDate); }, [reportDate]);

  const fetchReport = async (date: string) => {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);

    // ✅ เลือก receipt_no และ promotion_name มาด้วย
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, receipt_no, promotion_name, total_price, created_at, 
        tables(label), 
        order_items(quantity, menu_items(name))
      `)
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Report Error:", error.message);
      return;
    }

    const orders = (data as any[]) || [];
    setReportData(orders);
    setSummary({ sales: orders.reduce((sum, o) => sum + (o.total_price || 0), 0), bills: orders.length });
  };

  const handleExport = () => {
    if (!reportData.length) return alert("ไม่มีข้อมูล");

    // ✅ เรียงคอลัมน์ตามที่ต้องการ: เลขที่ใบเสร็จ, เวลา, โต๊ะ, รายการ, ยอดเงิน, โปรโมชั่น
    let csv = "เลขที่ใบเสร็จ,เวลา,โต๊ะ,รายการ,ยอดเงิน,โปรโมชั่น\n";

    reportData.forEach(o => {
      const receipt = o.receipt_no || "-";
      // const date = new Date(o.created_at).toLocaleDateString('th-TH'); // ตัดวันที่ออกตาม format ที่ขอ (เหลือแค่เวลา) หรือจะใส่ก็ได้
      const time = new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const items = o.order_items.map(i => `${i.menu_items?.name} x${i.quantity}`).join(" | ").replace(/,/g, "");
      const total = o.total_price;
      const promotion = o.promotion_name || "-";

      csv += `${receipt},${time},${o.tables?.label || '-'},"${items}",${total},${promotion}\n`;
    });
    downloadCSV(csv, `sales_${reportDate}.csv`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar size={20} /> เลือกวันที่</h3>
        <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-full border p-3 rounded-lg mb-6 font-bold text-gray-700" />
        <div className="space-y-4">
          <div className="flex justify-between p-4 bg-green-50 rounded-lg border-green-100 text-green-700 font-bold"><span>ยอดขาย</span><span>{summary.sales.toLocaleString()} ฿</span></div>
          <div className="flex justify-between p-4 bg-blue-50 rounded-lg border-blue-100 text-blue-700 font-bold"><span>จำนวนบิล</span><span>{summary.bills}</span></div>
        </div>
        <button onClick={handleExport} disabled={!reportData.length} className="w-full mt-6 bg-gray-800 text-white py-3 rounded-lg font-bold flex justify-center gap-2 disabled:bg-gray-300"><Download size={18} /> Export CSV</button>
      </div>
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
        <div className="p-4 border-b bg-gray-50 font-bold">รายการบิลขาย ({reportDate})</div>
        <div className="overflow-auto flex-1 p-0">
          {reportData.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-gray-400"><FileText size={48} className="mb-2 opacity-20" /><p>ไม่มีรายการ</p></div> : (
            <table className="w-full text-left">
              <thead className="bg-white border-b text-xs text-gray-500 uppercase sticky top-0 shadow-sm">
                <tr>
                  <th className="p-4">เลขที่ใบเสร็จ</th>
                  <th className="p-4">เวลา</th>
                  <th className="p-4">โต๊ะ</th>
                  <th className="p-4">รายการ</th>
                  <th className="p-4 text-right">ยอดเงิน</th>
                  <th className="p-4 text-center">โปรโมชั่น</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(o => (
                  <tr key={o.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-mono text-blue-600 font-bold">{o.receipt_no || '-'}</td>
                    <td className="p-4 text-sm font-mono text-gray-500">{new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-4 font-bold text-gray-800">{o.tables?.label}</td>
                    <td className="p-4 text-sm text-gray-600">{o.order_items.map((i, x) => <div key={x}>{i.menu_items?.name} x{i.quantity}</div>)}</td>
                    <td className="p-4 text-right font-bold text-green-700">+{o.total_price.toLocaleString()}</td>
                    <td className="p-4 text-center text-sm text-orange-600 font-medium">{o.promotion_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}