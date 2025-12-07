"use client";
import { useState } from "react";
import { verifyUserPin } from "@/app/actions";

export default function AdminLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await verifyUserPin(pin);
      if (result.success && result.user?.role === 'owner') {
        onLoginSuccess();
      } else {
        alert("รหัสไม่ถูกต้อง หรือไม่มีสิทธิ์ Owner");
        setPin("");
      }
    } catch { alert("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-80 border-t-4 border-blue-600">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">🔒 Admin Access</h1>
        <p className="text-sm text-gray-500 text-center mb-4">ใช้รหัส PIN ระดับเจ้าของ (Owner)</p>
        <input type="password" placeholder="PIN" className="w-full border p-3 rounded-lg mb-4 text-center text-2xl tracking-widest font-bold outline-none focus:border-blue-500" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-all">{loading ? "..." : "เข้าสู่ระบบ"}</button>
      </form>
    </div>
  );
}