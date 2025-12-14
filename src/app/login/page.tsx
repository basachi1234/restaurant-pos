"use client";

import { useState } from "react";
import { login } from "@/app/actions";
import { useRouter } from "next/navigation";
import { Lock, Delete, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNumClick = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) { // ตั้งค่าความยาว PIN ตามต้องการ (เช่น 4 หรือ 6)
        handleLogin(newPin);
      }
    }
  };

  const handleClear = () => setPin("");
  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  const handleLogin = async (currentPin: string) => {
    setLoading(true);
    // เรียก Server Action ที่เราแก้ไป
    const res = await login(currentPin);
    
    if (res.success) {
      router.push("/"); // Login ผ่าน -> ไปหน้าแรก
    } else {
      alert("❌ รหัสผิดครับพี่! ลองใหม่นะ");
      setPin("");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm flex flex-col items-center">
        
        <div className="bg-blue-100 p-4 rounded-full mb-4 text-blue-600">
          <Lock size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">เข้าสู่ระบบ</h1>
        <p className="text-gray-500 mb-8 text-sm">กรุณากดรหัสพนักงาน (PIN)</p>

        {/* ช่องแสดงผล PIN (เป็นจุดๆ) */}
        <div className="flex gap-4 mb-8 h-12 justify-center items-center">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length ? "bg-blue-600 scale-125" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-3 gap-4 w-full mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumClick(num.toString())}
              disabled={loading}
              className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-blue-50 border border-gray-100 text-2xl font-bold text-gray-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          
          <button onClick={handleClear} disabled={loading} className="h-16 rounded-2xl text-red-500 font-bold hover:bg-red-50 transition-colors">C</button>
          <button onClick={() => handleNumClick("0")} disabled={loading} className="h-16 rounded-2xl bg-gray-50 border border-gray-100 text-2xl font-bold text-gray-700 hover:bg-gray-100 shadow-sm">0</button>
          <button onClick={handleDelete} disabled={loading} className="h-16 rounded-2xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
            <Delete size={24} />
          </button>
        </div>

        {loading && (
           <div className="flex items-center gap-2 text-blue-600 animate-pulse">
             <Loader2 className="animate-spin" /> กำลังตรวจสอบ...
           </div>
        )}
      </div>
    </div>
  );
}