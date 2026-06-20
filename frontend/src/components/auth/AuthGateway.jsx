import React, { useState } from "react";
import { Terminal, Lock, Mail, User, ArrowRight } from "lucide-react";
import API from "../../api";

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
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary mx-auto">
            <Terminal className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold tracking-wide text-text-bright uppercase">
            {isLogin ? "Unlock MVault" : "Initialize Node Account"}
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

        {/* Form */}
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

        {/* Switcher Footer Toggle */}
        <div className="text-center pt-2">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[11px] text-text-muted hover:text-accent-primary transition-colors font-medium cursor-pointer"
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
