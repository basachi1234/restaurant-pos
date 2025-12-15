import { Utensils, Clock, Users } from "lucide-react";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tables: any[];
  selectedTableId: number | undefined;
  isReprintMode: boolean | undefined;
  onSelectTable: (id: number, label: string) => void;
  // ❌ ลบ onOpenHistory ออก (ไม่ใช้แล้ว)
};

export default function TableList({ 
  tables, 
  selectedTableId, 
  isReprintMode, 
  onSelectTable 
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      
      {/* Header ของ Box */}
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h2 className="font-bold text-gray-700 flex items-center gap-2 text-sm lg:text-base">
          <Utensils size={18} /> โต๊ะที่กำลังทาน
        </h2>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
          {tables.length} โต๊ะ
        </span>
        {/* ❌ ปุ่ม History เดิมตรงนี้ถูกลบออกแล้ว */}
      </div>
      
      {/* Content Grid */}
      <div className="p-3 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
        {tables.length === 0 ? (
           <div className="col-span-full flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
             <Users size={48} className="opacity-20" />
             <p className="text-sm">ไม่มีลูกค้าในร้าน</p>
           </div>
        ) : (
           tables.map((table) => {
             const isSelected = selectedTableId === table.id;
             return (
               <button
                 key={table.id}
                 onClick={() => onSelectTable(table.id, table.label)}
                 className={`
                   relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                   ${isSelected 
                     ? "border-blue-500 bg-blue-50 shadow-md scale-105 z-10" 
                     : "border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200"
                   }
                   ${isReprintMode && isSelected ? "border-orange-500 bg-orange-50" : ""}
                 `}
               >
                 <div className={`
                   w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                   ${isSelected ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"}
                 `}>
                   {table.label.replace(/\D/g, '')}
                 </div>
                 <div className="font-bold text-gray-700 text-sm">{table.label}</div>
                 
                 {isSelected && (
                   <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-sm">
                     <Clock size={12} />
                   </div>
                 )}
               </button>
             );
           })
        )}
      </div>
    </div>
  );
}