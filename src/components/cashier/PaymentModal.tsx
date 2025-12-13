import { Coins, X, QrCode, Banknote } from "lucide-react";

// ✅ กำหนด Props ให้ตรงกับที่ page.tsx ส่งมา
type Props = {
  totalAmount: number;
  paymentMethod: 'cash' | 'transfer';
  setPaymentMethod: (m: 'cash' | 'transfer') => void;
  cashReceived: string;
  setCashReceived: (val: string) => void;
  changeAmount: number;
  onConfirm: () => void;
  onClose: () => void;
};

export default function PaymentModal({
  totalAmount,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  changeAmount,
  onConfirm,
  onClose
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2"><Coins className="text-yellow-400"/> รับชำระเงิน</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-500 mb-1">ยอดสุทธิที่ต้องชำระ</p>
            <h2 className="text-4xl font-black text-gray-800">{totalAmount.toLocaleString()} ฿</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button 
              onClick={() => setPaymentMethod('transfer')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'transfer' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <QrCode size={24}/>
              <span className="font-bold">โอนจ่าย (QR)</span>
            </button>
            <button 
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <Banknote size={24}/>
              <span className="font-bold">เงินสด</span>
            </button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-2">รับเงินมา (บาท)</label>
              <input 
                type="number" 
                value={cashReceived} 
                onChange={e => setCashReceived(e.target.value)}
                className="w-full text-3xl font-bold p-3 border rounded-lg text-right focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="0"
                autoFocus
              />
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-200">
                <span className="text-gray-500 font-bold">เงินทอน</span>
                <span className={`text-2xl font-black ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {changeAmount.toLocaleString()} ฿
                </span>
              </div>
            </div>
          )}

          <button 
            onClick={onConfirm}
            disabled={paymentMethod === 'cash' && (parseFloat(cashReceived) < totalAmount || !cashReceived)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg disabled:bg-gray-300 disabled:text-gray-500 transition-all"
          >
            ยืนยันการรับเงิน
          </button>
        </div>
      </div>
    </div>
  );
}