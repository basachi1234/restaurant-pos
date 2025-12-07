"use client";
import { Banknote, ShoppingBag, Store, TrendingUp, Utensils } from "lucide-react";
import { TopItem } from "@/lib/types";

type Props = {
  stats: { totalRevenue: number; totalOrders: number; averageOrderValue: number };
  activeTableCount: number;
  topItems: TopItem[];
};

export default function DashboardTab({ stats, activeTableCount, topItems }: Props) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Banknote size={24}/></div>
          <div><p className="text-sm text-gray-500 font-medium">ยอดขายวันนี้</p><h3 className="text-2xl font-bold text-gray-800">{stats.totalRevenue.toLocaleString()} ฿</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><ShoppingBag size={24}/></div>
          <div><p className="text-sm text-gray-500 font-medium">จำนวนบิล</p><h3 className="text-2xl font-bold text-gray-800">{stats.totalOrders} บิล</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp size={24}/></div>
          <div><p className="text-sm text-gray-500 font-medium">เฉลี่ยต่อบิล</p><h3 className="text-2xl font-bold text-gray-800">{stats.averageOrderValue.toFixed(0)} ฿</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${activeTableCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}><Store size={24}/></div>
          <div><p className="text-sm text-gray-500 font-medium">โต๊ะที่กำลังทาน</p><h3 className="text-2xl font-bold text-gray-800">{activeTableCount} โต๊ะ</h3></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Utensils size={18}/> เมนูขายดีประจำวัน (Top 5)</h3></div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="p-4">ชื่อเมนู</th><th className="p-4 text-center">ขายได้ (จาน)</th><th className="p-4 text-right">ยอดรวม</th></tr></thead>
            <tbody>
              {topItems.length === 0 ? (<tr><td colSpan={3} className="p-8 text-center text-gray-400">ยังไม่มีข้อมูลการขายวันนี้</td></tr>) : topItems.map((item, idx) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-700 flex items-center gap-2"><span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span>{item.name}</td>
                  <td className="p-4 text-center font-bold text-blue-600">{item.quantity}</td>
                  <td className="p-4 text-right text-gray-600">{item.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}