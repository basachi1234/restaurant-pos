import { History } from "lucide-react";

// ✅ เพิ่ม isReprintMode เข้าไปใน Props
type Props = {
  tables: any[];
  selectedTableId: number | undefined;
  isReprintMode: boolean | undefined; // 👈 จุดที่ต้องเพิ่ม
  onSelectTable: (id: number, label: string) => void;
  onOpenHistory: () => void;
};

export default function TableList({ 
  tables, 
  selectedTableId, 
  isReprintMode, // 👈 รับค่ามาใช้
  onSelectTable, 
  onOpenHistory 
}: Props) {
  return (
    <div className="w-full md:w-1/3 print:hidden">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">💵 แคชเชียร์</h1>
        <button 
          onClick={onOpenHistory}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-700 shadow-sm"
        >
          <History size={16} /> ประวัติบิล
        </button>
      </div>

      <div className="grid gap-3">
        {tables.length === 0 && <p className="text-gray-500 text-center py-10">ไม่มีลูกค้าในร้าน</p>}
        {tables.map((t) => (
          <button 
            key={t.id} 
            onClick={() => onSelectTable(t.id, t.label)} 
            className={`p-4 rounded-xl text-left shadow-sm border-2 transition-all ${selectedTableId === t.id && !isReprintMode ? "border-blue-500 bg-blue-50" : "bg-white border-transparent"}`}
          >
            <div className="font-bold text-lg">โต๊ะ {t.label}</div>
            <div className="text-red-500 text-sm animate-pulse">● กำลังทาน...</div>
          </button>
        ))}
      </div>
    </div>
  );
}