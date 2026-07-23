"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLogo from "@/components/AppLogo";
import { Eye, EyeOff } from "lucide-react";

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [registrationKey, setRegistrationKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKeyFromUrl, setIsKeyFromUrl] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // If a key is passed in the URL (e.g. /setup?registrationKey=123), auto-fill it
    const key = searchParams.get("registrationKey") || searchParams.get("key");
    if (key) {
      setRegistrationKey(key);
      setIsKeyFromUrl(true);
    }
  }, [searchParams]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:4001/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation Onboard($input: OnboardInput!) {
              onboard(input: $input) {
                user {
                  userId
                  email
                  role
                  orgCode
                  departmentId
                }
              }
            }
          `,
          variables: {
            input: {
              registrationKey,
              email,
              password,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "An error occurred during setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card" style={{ paddingBottom: "2rem" }}>
      <div className="login-header">
        <h1
          className="login-title"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <AppLogo iconSize={36}/>
        </h1>
        <p className="login-subtitle" style={{ textAlign: "center", marginTop: "8px" }}>
          Initialize Organization
        </p>
      </div>
      
      {error && (
        <div style={{ color: "red", textAlign: "center", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}
      
      <form className="login-form" onSubmit={handleSetup}>
        <div className="input-group">
          <label className="input-label" htmlFor="registrationKey">
            Registration Key
          </label>
          <input
            id="registrationKey"
            type="text"
            name="registrationKey"
            className="login-input"
            placeholder="Enter your 36-character key"
            value={registrationKey}
            onChange={(e) => !isKeyFromUrl && setRegistrationKey(e.target.value)}
            readOnly={isKeyFromUrl}
            style={isKeyFromUrl ? { opacity: 0.7, cursor: "not-allowed", backgroundColor: "#f9fafb" } : {}}
            required
          />
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="email">
            SysAdmin Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            className="login-input"
            placeholder="admin@lgu.gov.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="password">
            Create Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              className="login-input"
              placeholder="Enter your new password"
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
        <div className="input-group">
          <label className="input-label" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              className="login-input"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button type="submit" className="primary-button login-button" disabled={loading} style={{ marginTop: "1rem" }}>
          {loading ? "Initializing..." : "Complete Setup"}
        </button>
      </form>
    </div>
  );
}

export default function SetupPage() {
  return (
    <div className="login-container">
      <Suspense fallback={<div className="login-card" style={{ padding: "2rem", textAlign: "center" }}>Loading setup...</div>}>
        <SetupForm />
      </Suspense>
    </div>
  );
}
