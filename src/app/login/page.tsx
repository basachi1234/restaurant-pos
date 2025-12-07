"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2 } from "lucide-react";
import { login } from "../actions"; // ✅ เรียกใช้ login action แทน

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    // const router = useRouter(); // ไม่ได้ใช้ ลบออกได้

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // ✅ เรียก Server Action เพื่อ Login และฝัง HttpOnly Cookie
            const result = await login(password);

            if (result.success) {
                // บังคับโหลดหน้าใหม่เพื่อเข้าสู่ระบบ (Middleware จะปล่อยผ่านเพราะมี Cookie แล้ว)
                window.location.href = "/";
            } else {
                alert(result.message || "รหัสผ่านไม่ถูกต้อง");
                setPassword("");
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาด");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-800 p-4">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="text-blue-600 w-8 h-8" />
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">เข้าสู่ระบบร้าน</h1>
                <p className="text-gray-500 mb-6 text-sm">กรุณากรอกรหัส PIN ส่วนตัว</p>

                <div className="relative mb-6">
                    <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center text-lg tracking-widest font-bold"
                        placeholder="PIN"
                        autoFocus
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "เข้าใช้งาน"}
                </button>
            </form>
        </div>
    );
}