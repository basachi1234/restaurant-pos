import { History, X, Calendar } from "lucide-react";

type Props = {
  orders: any[];
  onSelectOrder: (id: string, receiptNo: string) => void;
  onClose: () => void;
  date: string;
  setDate: (date: string) => void;
  minDate: string;
  maxDate: string;
};

export default function HistoryModal({ orders, onSelectOrder, onClose, date, setDate, minDate, maxDate }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2"><History className="text-yellow-400" /> ประวัติการขาย</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="p-4 bg-gray-100 border-b flex items-center gap-3">
            <Calendar className="text-gray-500" />
            <span className="font-bold text-gray-700">เลือกวันที่:</span>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={maxDate}
              min={minDate} 
              className="p-2 border rounded-lg shadow-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-xs text-gray-400 ml-auto">(ย้อนหลังได้ 30 วัน)</span>
        </div>

        <div className="p-0 overflow-y-auto flex-1">
          {orders.length === 0 ? (
            <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                <div className="text-4xl mb-2">📅</div>
                <p>ไม่พบรายการขายในวันที่เลือก</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-3 border-b text-sm">เวลา</th>
                  <th className="p-3 border-b text-sm">เลขใบเสร็จ</th>
                  <th className="p-3 border-b text-sm">โต๊ะ</th>
                  <th className="p-3 border-b text-right text-sm">ยอดเงิน</th>
                  <th className="p-3 border-b"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((h: any) => (
                  <tr key={h.id} className="hover:bg-blue-50 border-b last:border-none transition-colors">
                    <td className="p-3 text-sm text-gray-600">{new Date(h.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="p-3 font-mono text-sm font-bold text-gray-800">{h.receipt_no || "-"}</td>
                    <td className="p-3 text-sm">{(h.tables as any)?.label || "Takeaway"}</td>
                    <td className="p-3 text-right font-bold text-green-700">{h.total_price.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => onSelectOrder(h.id, h.receipt_no)}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors"
                      >
                        ดู / พิมพ์
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="bg-gray-50 p-2 text-center text-xs text-gray-400 border-t">
            แสดงรายการขายของวันที่ {new Date(date).toLocaleDateString('th-TH')}
        </div>
      </div>
    </div>
  );
}