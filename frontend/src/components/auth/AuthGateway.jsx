import React, { useState } from "react";
import { Lock, Mail, User, ArrowRight } from "lucide-react";
import API from "../../api";

const AuthLogo = () => (
  <div className="relative w-12 h-12 flex items-center justify-center mx-auto mb-4 group">
    <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-[6px] group-hover:bg-cyan-500/20 transition-all duration-300" />

    <div className="w-12 h-12 rounded-xl bg-[#1A1F26] border border-white/[0.08] flex items-center justify-center relative overflow-hidden shadow-2xl">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22D3EE"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 relative z-10 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
      >
        <path d="M12 5L3 9.5l9 4.5 9-4.5-9-4.5z" />
        <path d="M3 14.5l9 4.5 9-4.5" />
        <path d="M3 19.5l9 4.5 9-4.5" />
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4px_4px]" />
    </div>
  </div>
);

export default function AuthGateway({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isLogin ? "/auth/login" : "/auth/register";
    try {
      const res = await API.post(endpoint, formData);
      localStorage.setItem("mvault_token", res.data.token);
      onAuthSuccess();
    } catch (err) {
      setError(
        err.response?.data?.message || "Authentication sequence failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-card border border-white/[0.03] rounded-3xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.3)] space-y-6">
        <div className="text-center space-y-2">
          <AuthLogo />
          <h2 className="text-lg font-black tracking-[0.12em] text-text-bright uppercase bg-gradient-to-r from-text-bright via-text-bright to-white/60 bg-clip-text text-transparent">
            {isLogin ? "Unlock MVault" : "Initialize Node"}
          </h2>
          <p className="text-xs text-text-muted">
            Enter credentials to authenticate secure storage link.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="w-4 h-4 absolute left-4 top-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Full Name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-bg-base border border-white/[0.04] focus:border-accent-primary/40 rounded-xl pl-11 pr-4 py-3.5 text-xs text-text-bright outline-none transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="w-4 h-4 absolute left-4 top-3.5 text-text-muted" />
            <input
              type="email"
              placeholder="System Email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full bg-bg-base border border-white/[0.04] focus:border-accent-primary/40 rounded-xl pl-11 pr-4 py-3.5 text-xs text-text-bright outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 absolute left-4 top-3.5 text-text-muted" />
            <input
              type="password"
              placeholder="Security Key"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full bg-bg-base border border-white/[0.04] focus:border-accent-primary/40 rounded-xl pl-11 pr-4 py-3.5 text-xs text-text-bright outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-text-bright hover:bg-white text-bg-base font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl disabled:opacity-50"
          >
            {loading
              ? "Processing Cryptographic Verification..."
              : isLogin
                ? "Access Storage Node"
                : "Register Secure Space"}
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[11px] text-text-muted hover:text-cyan-400 transition-colors font-medium cursor-pointer"
          >
            {isLogin
              ? "Need a pristine container? Create account"
              : "Existing node? Decrypt workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
