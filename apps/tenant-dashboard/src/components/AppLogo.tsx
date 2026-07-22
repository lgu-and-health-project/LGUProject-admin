import { Landmark } from "lucide-react";
import React from "react";

interface AppLogoProps {
  className?: string;
  iconSize?: number;
}

export default function AppLogo({ className = "", iconSize = 28 }: AppLogoProps) {
  return (
    <span className={`app-logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
      Lingkod <Landmark size={iconSize} strokeWidth={2.5} /> Lokal
    </span>
  );
}
