import { Coins, X, QrCode, Banknote } from "lucide-react";

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
    // ✅ ใช้ class modal และ modal-open ของ DaisyUI
    <dialog className="modal modal-open print:hidden">
      <div className="modal-box max-w-md p-0 overflow-hidden">
        
        {/* Header */}
        <div className="bg-neutral text-neutral-content p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2"><Coins className="text-warning"/> รับชำระเงิน</h3>
          <button onClick={onClose} className="btn btn-circle btn-ghost btn-sm"><X size={20}/></button>
        </div>
        
        <div className="p-6 flex flex-col gap-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">ยอดสุทธิ</p>
            <h2 className="text-4xl font-black">{totalAmount.toLocaleString()} ฿</h2>
          </div>

          {/* ปุ่มเลือกวิธีจ่ายเงิน */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setPaymentMethod('transfer')}
              className={`btn h-auto py-4 flex flex-col gap-1 ${paymentMethod === 'transfer' ? 'btn-primary' : 'btn-outline'}`}
            >
              <QrCode size={24}/> โอนจ่าย (QR)
            </button>
            <button 
              onClick={() => setPaymentMethod('cash')}
              className={`btn h-auto py-4 flex flex-col gap-1 ${paymentMethod === 'cash' ? 'btn-success text-white' : 'btn-outline'}`}
            >
              <Banknote size={24}/> เงินสด
            </button>
          </div>

          {/* ส่วนรับเงินสด */}
          {paymentMethod === 'cash' && (
            <div className="bg-base-200 p-4 rounded-box">
              <label className="label">
                <span className="label-text font-bold">รับเงินมา (บาท)</span>
              </label>
              <input 
                type="number" 
                value={cashReceived} 
                onChange={e => setCashReceived(e.target.value)}
                className="input input-bordered input-lg w-full text-right text-2xl font-bold text-primary"
                placeholder="0"
                autoFocus
              />
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-base-300">
                <span className="font-bold opacity-70">เงินทอน</span>
                <span className={`text-2xl font-black ${changeAmount < 0 ? 'text-error' : 'text-success'}`}>
                  {changeAmount.toLocaleString()} ฿
                </span>
              </div>
            </div>
          )}

          {/* ปุ่มยืนยัน */}
          <button 
            onClick={onConfirm}
            disabled={paymentMethod === 'cash' && (parseFloat(cashReceived) < totalAmount || !cashReceived)}
            className="btn btn-primary btn-lg w-full text-xl shadow-lg mt-2"
          >
            ยืนยันการรับเงิน
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}