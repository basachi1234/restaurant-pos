import { Printer, TicketPercent, AlertTriangle, ChefHat, Ban, CheckCircle, Check } from "lucide-react";

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
  isPaymentSuccess?: boolean;
  onFinishOrder?: () => void;
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
  onOpenPayment,
  isPaymentSuccess = false,
  onFinishOrder
}: Props) {
  
  if (!selectedOrder) {
    return (
      // ✅ ปรับขนาด Placeholder ให้เท่าใบเสร็จจริง (ประมาณ 300px)
      <div className="w-full md:w-[300px] bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
        <div className="text-6xl mb-4">👈</div>
        <p>เลือกโต๊ะเพื่อเช็คบิล</p>
      </div>
    );
  }

  return (
    // ✅ กำหนดความกว้างคงที่ 300px (ประมาณ 58mm + เผื่อขอบ) เพื่อให้ดูเป็นสลิปยาวๆ
    <div className="w-full md:w-[300px] bg-white rounded-xl shadow-lg p-3 relative h-fit flex-shrink-0">
      
      {(selectedOrder.isReprint || isPaymentSuccess) && (
         <div className="absolute top-3 right-3 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-bold print:hidden">
           {isPaymentSuccess ? "✅ จ่ายแล้ว" : "ย้อนหลัง"}
         </div>
      )}

      <div>
        {/* ส่วนเนื้อหาใบเสร็จ (ลด padding เหลือ p-2 ให้พอดีกับหน้ากว้างที่แคบลง) */}
        <div id="receipt-area" className="w-full mx-auto border p-2 text-sm bg-white mb-4 print:border-none print:w-full print:max-w-none print:p-0 print:m-0">
          <div className="text-center mb-3">
            {shopLogo && <img src={shopLogo} className="h-12 mx-auto mb-2 object-contain" alt="Logo" />}
            <div className="font-bold text-lg mb-0.5">{shopName}</div>
            <div className="text-[10px] text-gray-500 print:text-black">ใบเสร็จรับเงิน / Receipt</div>
            {(selectedOrder.isReprint || isPaymentSuccess) && <div className="text-[10px] font-bold mt-0.5">(สำเนา)</div>}
            <div className="text-[10px] text-gray-500 mt-1 print:text-black leading-tight">
              <div>เลขที่: {currentReceiptNo}</div>
              <div>โต๊ะ: {selectedOrder.table_label} | วันที่: {new Date().toLocaleDateString('th-TH')}</div>
            </div>
          </div>

          <hr className="my-2 border-dashed border-gray-300" />

          <div className="flex flex-col gap-1.5">
            {calculation.itemDetails.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs">
                <div className="flex flex-col w-[60%]">
                  <span className="font-medium">{item.name}</span>
                  {item.note && <span className="text-[9px] text-green-600 font-bold print:text-black">{item.note}</span>}
                </div>
                <div className="w-[15%] text-right text-gray-500">x{item.quantity}</div>
                <div className="w-[25%] text-right font-bold">{item.finalPrice.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <hr className="my-2 border-dashed border-gray-300" />

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>รวม</span>
              <span>{calculation.subtotal.toLocaleString()}</span>
            </div>

            {calculation.discount > 0 && (
              <div className="flex justify-between text-red-500 print:text-black">
                <span>ส่วนลด ({calculation.discountName})</span>
                <span>-{calculation.discount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-lg mt-2 border-t border-black pt-2">
              <span>สุทธิ</span>
              <span>{calculation.grandTotal.toLocaleString()} ฿</span>
            </div>
            
            {(!selectedOrder.isReprint || isPaymentSuccess) && paymentMethod === 'cash' && cashReceived && (
              <div className="text-[10px] text-gray-500 mt-2 print:block hidden">
                  <div className="flex justify-between"><span>รับเงิน:</span><span>{parseFloat(cashReceived).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>เงินทอน:</span><span>{changeAmount.toLocaleString()}</span></div>
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            {calculation.grandTotal > 0 && qrCodeData && paymentMethod !== 'cash' && !selectedOrder.isReprint && !isPaymentSuccess && (
              <div className="flex flex-col items-center">
                  <img src={qrCodeData} alt="PromptPay QR" className="w-24 h-24 border p-1 rounded mb-1" />
                  <p className="text-[9px] text-gray-500">สแกนจ่าย</p>
              </div>
            )}
            <p className="text-[9px] text-gray-400 mt-3">ขอบคุณครับ/ค่ะ</p>
          </div>
        </div>
      </div>

      {!selectedOrder.isReprint && !isPaymentSuccess && (
        <div className="print:hidden bg-gray-50 p-2 rounded-lg border border-gray-200 mb-3">
          <div className="flex items-center gap-1 mb-1 text-gray-700 font-bold text-xs">
            <TicketPercent size={14} className="text-orange-500" /> ส่วนลด
          </div>
          <select
            value={selectedDiscountId}
            onChange={(e) => onSelectDiscount(Number(e.target.value) || "")}
            className="w-full border p-2 rounded-md text-gray-700 outline-none focus:ring-1 focus:ring-orange-200 bg-white text-xs"
          >
            <option value="">-- ไม่ใช้ --</option>
            {discounts.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.type === 'percent' ? `-${d.value}%` : `-${d.value}บ.`})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedOrder.pendingCount > 0 && !isPaymentSuccess && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-2 mb-3 rounded mx-auto print:hidden flex items-center gap-2">
          <AlertTriangle size={18} />
          <div>
            <p className="font-bold text-xs">รอเสิร์ฟ {selectedOrder.pendingCount} รายการ</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center print:hidden pt-2 border-t">
        <button
          onClick={onPrint}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg flex gap-2 font-bold hover:bg-black transition-colors flex-1 justify-center items-center text-xs"
        >
          <Printer size={16} /> {selectedOrder.isReprint || isPaymentSuccess ? "พิมพ์" : "พิมพ์ใบเสร็จ"}
        </button>

        {!selectedOrder.isReprint && (
          isPaymentSuccess ? (
            <button
              onClick={onFinishOrder}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex gap-2 font-bold hover:bg-blue-700 transition-all shadow-sm flex-1 justify-center items-center text-xs"
            >
              <Check size={16} /> จบรายการ
            </button>
          ) : (
            <button
              onClick={calculation.grandTotal === 0 ? onVoid : onOpenPayment}
              disabled={selectedOrder.pendingCount > 0}
              className={`
                px-3 py-2 rounded-lg flex gap-2 font-bold transition-all shadow-sm flex-1 justify-center items-center text-xs
                ${selectedOrder.pendingCount > 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : calculation.grandTotal === 0
                    ? "bg-red-600 text-white hover:bg-red-700 hover:scale-105"
                    : "bg-green-600 text-white hover:bg-green-700 hover:scale-105"
                }
              `}
            >
              {selectedOrder.pendingCount > 0
                ? (<><ChefHat size={16} /> รอครัว</>)
                : calculation.grandTotal === 0
                  ? (<><Ban size={16} /> Void</>)
                  : (<><CheckCircle size={16} /> ชำระเงิน</>)
              }
            </button>
          )
        )}
      </div>
    </div>
  );
}