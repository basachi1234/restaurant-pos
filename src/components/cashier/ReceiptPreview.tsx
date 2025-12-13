import { Printer, TicketPercent, AlertTriangle, ChefHat, Ban, CheckCircle } from "lucide-react";

// Types
type ItemDetail = {
  name: string;
  quantity: number;
  finalPrice: number;
  note: string;
};

type CalculationResult = {
  subtotal: number;
  discount: number;
  grandTotal: number;
  discountName: string;
  itemDetails: ItemDetail[];
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedOrder: any | null;
  calculation: CalculationResult;
  shopName: string;
  shopLogo: string | null;
  currentReceiptNo: string;
  qrCodeData: string;
  paymentMethod: 'cash' | 'transfer';
  cashReceived: string;
  changeAmount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  discounts: any[];
  selectedDiscountId: number | "";
  onSelectDiscount: (id: number | "") => void;
  onPrint: () => void;
  onVoid: () => void;
  onOpenPayment: () => void;
};

export default function ReceiptPreview({
  selectedOrder,
  calculation,
  shopName,
  shopLogo,
  currentReceiptNo,
  qrCodeData,
  paymentMethod,
  cashReceived,
  changeAmount,
  discounts,
  selectedDiscountId,
  onSelectDiscount,
  onPrint,
  onVoid,
  onOpenPayment
}: Props) {
  
  if (!selectedOrder) {
    return (
      <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center text-gray-400 min-h-[500px]">
        <div className="text-6xl mb-4">👈</div>
        <p>เลือกโต๊ะทางซ้ายเพื่อเช็คบิล</p>
      </div>
    );
  }

  return (
    <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg p-8 relative min-h-[500px] flex flex-col">
      {selectedOrder.isReprint && (
         <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold print:hidden">
           โหมดดูย้อนหลัง
         </div>
      )}

      <div className="flex-1">
        <div id="receipt-area" className="max-w-[350px] mx-auto border p-6 text-sm bg-white mb-6 print:border-none print:w-full print:max-w-none print:p-0 print:m-0">
          <div className="text-center mb-4">
            {shopLogo && <img src={shopLogo} className="h-16 mx-auto mb-2 object-contain" alt="Logo" />}
            <div className="font-bold text-xl mb-1">{shopName}</div>
            <div className="text-xs text-gray-500 print:text-black">ใบเสร็จรับเงิน / Receipt</div>
            {selectedOrder.isReprint && <div className="text-xs font-bold mt-1">(สำเนา / Copy)</div>}
            <div className="text-xs text-gray-500 mt-1 print:text-black">
              <div>เลขที่: {currentReceiptNo}</div>
              <div>โต๊ะ: {selectedOrder.table_label} | วันที่: {new Date().toLocaleDateString('th-TH')}</div>
            </div>
          </div>

          <hr className="my-3 border-dashed border-gray-300" />

          <div className="flex flex-col gap-2">
            {calculation.itemDetails.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex flex-col w-[65%]">
                  <span>{item.name}</span>
                  {item.note && <span className="text-[10px] text-green-600 font-bold print:text-black">{item.note}</span>}
                </div>
                <div className="w-[10%] text-right text-gray-500">x{item.quantity}</div>
                <div className="w-[25%] text-right font-medium">{item.finalPrice.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <hr className="my-3 border-dashed border-gray-300" />

          <div className="space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>รวมเป็นเงิน</span>
              <span>{calculation.subtotal.toLocaleString()}</span>
            </div>

            {calculation.discount > 0 && (
              <div className="flex justify-between text-red-500 print:text-black">
                <span>ส่วนลด ({calculation.discountName})</span>
                <span>-{calculation.discount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-xl mt-2 border-t border-black pt-2">
              <span>ยอดสุทธิ</span>
              <span>{calculation.grandTotal.toLocaleString()} ฿</span>
            </div>
            
            {!selectedOrder.isReprint && paymentMethod === 'cash' && cashReceived && (
              <div className="text-xs text-gray-500 mt-2 print:block hidden">
                  <div className="flex justify-between"><span>รับเงินสด:</span><span>{parseFloat(cashReceived).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>เงินทอน:</span><span>{changeAmount.toLocaleString()}</span></div>
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            {calculation.grandTotal > 0 && qrCodeData && paymentMethod !== 'cash' && !selectedOrder.isReprint && (
              <div className="flex flex-col items-center">
                  <img src={qrCodeData} alt="PromptPay QR" className="w-32 h-32 border p-2 rounded mb-2" />
                  <p className="text-[10px] text-gray-500">สแกนจ่ายได้ทันที</p>
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-4">ขอบคุณที่ใช้บริการ</p>
          </div>
        </div>
      </div>

      {!selectedOrder.isReprint && (
        <div className="print:hidden bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
          <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
            <TicketPercent size={20} className="text-orange-500" /> โปรโมชั่นส่วนลดท้ายบิล
          </div>
          <select
            value={selectedDiscountId}
            onChange={(e) => onSelectDiscount(Number(e.target.value) || "")}
            className="w-full border p-3 rounded-lg text-gray-700 outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">-- ไม่ใช้ส่วนลด --</option>
            {discounts.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.type === 'percent' ? `ลด ${d.value}%` : `ลด ${d.value} บาท`})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedOrder.pendingCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded mx-auto max-w-md print:hidden flex items-center gap-3">
          <AlertTriangle />
          <div>
            <p className="font-bold">ยังเช็คบิลไม่ได้!</p>
            <p className="text-sm">มีอาหารค้างส่ง {selectedOrder.pendingCount} รายการ</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 justify-center print:hidden pt-4 border-t">
        <button
          onClick={onPrint}
          className="bg-gray-800 text-white px-6 py-3 rounded-lg flex gap-2 font-bold hover:bg-black transition-colors"
        >
          <Printer /> {selectedOrder.isReprint ? "พิมพ์ใบเสร็จซ้ำ" : "พิมพ์ใบเสร็จ (ตัวอย่าง)"}
        </button>

        {!selectedOrder.isReprint && (
          <button
            onClick={calculation.grandTotal === 0 ? onVoid : onOpenPayment}
            disabled={selectedOrder.pendingCount > 0}
            className={`
              px-6 py-3 rounded-lg flex gap-2 font-bold transition-all shadow-lg
              ${selectedOrder.pendingCount > 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : calculation.grandTotal === 0
                  ? "bg-red-600 text-white hover:bg-red-700 hover:scale-105"
                  : "bg-green-600 text-white hover:bg-green-700 hover:scale-105"
              }
            `}
          >
            {selectedOrder.pendingCount > 0
              ? (<><ChefHat /> รอครัว...</>)
              : calculation.grandTotal === 0
                ? (<><Ban /> ยกเลิกโต๊ะ (Void)</>)
                : (<><CheckCircle /> ชำระเงิน / ปิดบิล</>)
            }
          </button>
        )}
      </div>
    </div>
  );
}