"use client";

import { useState } from "react";
import { login } from "@/app/actions";
import { useRouter } from "next/navigation";
import { Lock, Delete } from "lucide-react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNumClick = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) { 
        handleLogin(newPin);
      }
    }
  };

  const handleClear = () => setPin("");
  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  const handleLogin = async (currentPin: string) => {
    setLoading(true);
    // เรียก Server Action
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
    // ✅ ใช้ bg-base-200 เพื่อรองรับ Dark Mode/Theme
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      
      {/* ✅ ใช้ Card Component ของ DaisyUI */}
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          
          {/* Icon Header */}
          <div className="avatar placeholder mb-2">
            <div className="bg-primary text-primary-content rounded-full w-16 p-4">
              <Lock size={32} />
            </div>
          </div>
          
          <h1 className="card-title text-2xl mb-1">เข้าสู่ระบบ</h1>
          <p className="text-base-content/60 text-sm mb-6">กรุณากดรหัสพนักงาน (PIN)</p>

          {/* ✅ PIN Dots (ใช้ mask และสี primary) */}
          <div className="flex gap-4 mb-8 h-8 items-center justify-center">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={`mask mask-circle w-4 h-4 transition-all duration-200 ${
                  i < pin.length ? "bg-primary scale-125" : "bg-base-300"
                }`}
              />
            ))}
          </div>

          {/* ✅ Numpad Grid: ใช้ class btn btn-ghost หรือ btn-lg */}
          <div className="grid grid-cols-3 gap-3 w-full mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumClick(num.toString())}
                disabled={loading}
                className="btn btn-lg btn-ghost text-2xl font-normal"
              >
                {num}
              </button>
            ))}
            
            {/* ปุ่ม C (Clear) */}
            <button 
              onClick={handleClear} 
              disabled={loading} 
              className="btn btn-lg btn-ghost text-error font-bold"
            >
              C
            </button>
            
            {/* ปุ่ม 0 */}
            <button 
              onClick={() => handleNumClick("0")} 
              disabled={loading} 
              className="btn btn-lg btn-ghost text-2xl font-normal"
            >
              0
            </button>
            
            {/* ปุ่มลบ (Backspace) */}
            <button 
              onClick={handleDelete} 
              disabled={loading} 
              className="btn btn-lg btn-ghost"
            >
              <Delete size={24} />
            </button>
          </div>

          {/* ✅ Loading: ใช้ class loading ของ DaisyUI */}
          {loading && (
             <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
               <span className="loading loading-spinner loading-md"></span> 
               กำลังตรวจสอบ...
             </div>
          )}
        </div>
      </div>
    </div>
  );
}