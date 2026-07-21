"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AppLogo from "@/components/AppLogo";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    router.push("/");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1
            className="login-title"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <AppLogo iconSize={36}/>
          </h1>
        </div>
        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              className="login-input"
              placeholder="user@lgu.gov.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                className="login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="primary-button login-button">
            Sign In
          </button>
        </form>
        <div className="login-footer">
          <p>Managed by the LGU Administration</p>
        </div>
      </div>
    </div>
  );
}
