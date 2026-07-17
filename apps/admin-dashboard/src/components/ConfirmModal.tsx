"use client";

import { X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-text-secondary/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-text-secondary/10">
          <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
          <button onClick={onCancel} className="text-text-secondary hover:text-foreground transition-colors p-1 rounded-md hover:bg-background">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5">
          <p className="text-sm text-text-secondary mb-6">{message}</p>
          
          <div className="flex justify-end gap-3">
            <button 
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-background rounded-lg transition-colors border border-text-secondary/20"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                isDestructive 
                  ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" 
                  : "bg-primary hover:bg-primary/90 shadow-primary/20"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
