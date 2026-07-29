"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, CurrentUser } from "@/services/auth";

import { ADMIN_MODULES, LGU_MODULES } from "@/lib/config/modules";
import { hasAccess } from "@/lib/permissions";

export default function DashboardIndex() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndRedirect = async () => {
      const u = await authService.getUser();
      if (!u) {
        router.push("/login");
        return;
      }

      // Find the first module they have access to
      const adminItem = ADMIN_MODULES.find(m => hasAccess(u, m.id));
      if (adminItem) {
        router.push(adminItem.path);
        return;
      }

      const lguItem = LGU_MODULES.find(m => hasAccess(u, m.id));
      if (lguItem) {
        router.push(lguItem.path);
        return;
      }

      // Fallback
      router.push("/profile");
    };

    fetchUserAndRedirect();
  }, [router]);

  return (
    <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-tertiary)" }}>Loading workspace...</p>
    </div>
  );
}
