"use client";
import { ReactNode } from "react";
import { useRole } from "@/components/RoleProvider";
import { Module, hasAccess } from "@/lib/permissions";

interface DashboardTemplateProps {
  module: Module;
  title: string;
  description: string;
  children: ReactNode;
}

export default function DashboardTemplate({
  module,
  title,
  description,
  children
}: DashboardTemplateProps) {
  const { role } = useRole();

  if (!hasAccess(role, module, "read")) {
    return (
      <div className="page-header">
        <h1 className="page-title">Access Denied</h1>
        <p className="page-description">
          Your account type ({role}) does not have permission to view {title}.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      <div className="card-grid">
        {children}
      </div>
    </div>
  );
}
