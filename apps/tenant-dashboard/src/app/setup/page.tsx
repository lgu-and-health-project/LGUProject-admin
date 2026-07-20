"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLogo from "@/components/AppLogo";

export default function SetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [registrationKey, setRegistrationKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If a key is passed in the URL (e.g. /setup?key=123), auto-fill it
    const key = searchParams.get("key");
    if (key) {
      setRegistrationKey(key);
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
      // Send a GraphQL mutation to the tenant-api
      // Adjust the URL if your tenant-api runs on a different port or path
      const response = await fetch("http://localhost:4001/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation Onboard($input: OnboardInput!) {
              onboard(input: $input) {
                accessToken
                user {
                  id
                  email
                  role
                  orgCode
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

      // Success! The API sets an HTTP-only cookie with the accessToken,
      // so we can just redirect to the dashboard home.
      router.push("/");
    } catch (err: any) {
      setError(err.message || "An error occurred during setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
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
              onChange={(e) => setRegistrationKey(e.target.value)}
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
            <input
              id="password"
              type="password"
              name="password"
              className="login-input"
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              className="login-input"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="primary-button login-button" disabled={loading} style={{ marginTop: "1rem" }}>
            {loading ? "Initializing..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
