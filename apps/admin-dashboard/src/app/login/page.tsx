"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authService.login({ email, password });

      // Successful login! The HttpOnly cookie is set by the backend.
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-full bg-background overflow-hidden">
      {/* Left panel: 25% width */}
      <section className="w-1/4 h-full bg-surface shadow-2xl z-10 flex flex-col justify-center px-8 xl:px-12 relative border-r border-text-secondary/10">
        <div className="absolute top-8 left-8 xl:left-12">
          {/* Logo Placeholder */}
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-xl leading-none tracking-tighter">
              LP
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
            Sign In
          </h1>
          <p className="text-text-secondary mb-10 text-sm">
            Welcome back to the Admin Dashboard.
          </p>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-xl border border-red-500/20">
                {error}
              </div>
            )}
            <div className="space-y-2 group">
              <label
                className="text-sm font-semibold text-foreground"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 rounded-xl bg-background border border-text-secondary/20 text-foreground placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                required
              />
            </div>

            <div className="space-y-2 group">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-primary hover:text-secondary transition-colors"
                >
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-background border border-text-secondary/20 text-foreground placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 mt-2 rounded-xl bg-primary text-white font-medium tracking-wide hover:bg-secondary hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-300 relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">
                {loading ? "Signing In..." : "Login"}
              </span>
              {/* Subtle hover gradient effect */}
              {!loading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Right panel: 75% width */}
      <section className="w-3/4 h-full relative bg-background overflow-hidden flex items-center justify-center">
        {/* Decorative ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />

        {/* Dynamic Abstract Shapes (Glassmorphism + Gradients) */}
        <div
          className="absolute top-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 blur-[100px] opacity-70 animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div className="absolute bottom-[-15%] left-[5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tr from-info/10 to-primary/10 blur-[100px] opacity-60" />

        {/* Showcase / Information Card */}
        <div className="relative z-10 p-12 lg:p-16 text-center max-w-3xl backdrop-blur-xl bg-surface/40 dark:bg-surface/20 border border-white/20 dark:border-white/5 rounded-[2rem] shadow-2xl">
          <div className="inline-flex items-center justify-center space-x-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full mb-8 text-sm font-semibold tracking-wide">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            System Online
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-foreground mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
            LGU Platform Services
          </h2>
          <p className="text-lg lg:text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
            Experience the next generation of administrative management.
            Streamline your workflows with our secure, intuitive, and modern
            dashboard.
          </p>
        </div>
      </section>
    </main>
  );
}
