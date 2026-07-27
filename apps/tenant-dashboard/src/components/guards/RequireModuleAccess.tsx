"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, CurrentUser } from "@/services/auth";
import { hasAccess } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";

interface RequireModuleAccessProps {
  moduleId: string;
  action?: "create" | "read" | "update" | "delete";
  children: React.ReactNode;
}

/**
 * Wrap any page under app/(dashboard)/ with this. Without it, hiding a nav
 * link in the sidebar was the ONLY thing stopping access — typing the path
 * directly into the URL bar still rendered the page for anyone logged in,
 * regardless of role.
 */
export default function RequireModuleAccess({
  moduleId,
  action = "read",
  children,
}: RequireModuleAccessProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    authService.getUser().then((u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "50vh", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-tertiary)" }}>Checking access...</p>
      </div>
    );
  }

  if (!hasAccess(user, moduleId, action)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "4rem 2rem",
          textAlign: "center",
          color: "var(--text-tertiary)",
        }}
      >
        <ShieldAlert size={40} />
        <div>
          <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            You don't have access to this page
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            Ask your System Administrator to grant you {action} access to this module.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
