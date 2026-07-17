"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck, X } from "lucide-react";
import { adminService } from "@/services/adminService";
import { ConfirmModal } from "@/components/ConfirmModal";

function InviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  if (!token) {
    return (
      <div className="text-center p-6 bg-red-50 border border-red-100 rounded-xl">
        <h3 className="text-red-800 font-medium mb-1">Invalid Link</h3>
        <p className="text-red-600 text-sm">No invitation token was provided in the URL.</p>
        <div className="mt-4 p-2 bg-red-100 text-xs text-red-800 break-all text-left font-mono rounded">
          Debug URL: {typeof window !== 'undefined' ? window.location.href : 'SSR'}
        </div>
      </div>
    );
  }

  const executeReject = async () => {
    setIsRejecting(true);
    try {
      await adminService.rejectInvite({ token });
      setIsRejected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline invitation.");
      setIsRejecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await adminService.acceptInvite({ token, password });
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isRejected) {
    return (
      <div className="text-center p-8 bg-surface border border-text-secondary/10 rounded-2xl shadow-xl">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <X className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Invitation Declined</h2>
        <p className="text-text-secondary mb-6">
          You have successfully declined the invitation. The platform administrator has been notified.
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center p-8 bg-surface border border-text-secondary/10 rounded-2xl shadow-xl">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-6">
          <ShieldCheck className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to the Team!</h2>
        <p className="text-text-secondary mb-6">
          Your account has been successfully activated. You can now log in using your new password.
        </p>
        <p className="text-sm text-text-secondary/70">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-text-secondary/10 rounded-2xl shadow-xl w-full max-w-md p-8">
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Accept Invitation</h2>
        <p className="text-sm text-text-secondary mt-2">
          Set a secure password to activate your administrator account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full px-4 py-2.5 bg-background border border-text-secondary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full px-4 py-2.5 bg-background border border-text-secondary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || isRejecting}
          className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all shadow-sm shadow-primary/20 flex items-center justify-center disabled:opacity-50 mt-4"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Activate Account"}
        </button>

        <button
          type="button"
          onClick={() => setShowRejectConfirm(true)}
          disabled={isLoading || isRejecting}
          className="w-full py-2.5 bg-transparent hover:bg-red-50 text-red-600 rounded-xl font-medium transition-all flex items-center justify-center disabled:opacity-50 mt-2"
        >
          {isRejecting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Decline Invitation"}
        </button>
      </form>

      <ConfirmModal
        isOpen={showRejectConfirm}
        title="Decline Invitation"
        message="Are you sure you want to decline this invitation? The platform administrator will be notified."
        confirmText="Decline"
        isDestructive={true}
        onConfirm={executeReject}
        onCancel={() => setShowRejectConfirm(false)}
      />
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/2" />
      
      <div className="mb-8 relative z-10 text-center">
        <div className="w-12 h-12 bg-primary flex items-center justify-center text-white font-bold text-xl rounded-xl shadow-lg mx-auto mb-4">
          LP
        </div>
        <h1 className="text-xl font-bold text-foreground">Admin Portal</h1>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<div className="text-center text-text-secondary"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
          <InviteForm />
        </Suspense>
      </div>
    </div>
  );
}
