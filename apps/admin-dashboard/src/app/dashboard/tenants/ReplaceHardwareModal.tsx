import { useState } from "react";
import { X, Server } from "lucide-react";
import toast from "react-hot-toast";
import { deviceService } from "@/services/deviceService";

interface ReplaceHardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldDeviceId: string;
  onSuccess: () => void;
}

export function ReplaceHardwareModal({ isOpen, onClose, oldDeviceId, onSuccess }: ReplaceHardwareModalProps) {
  const [newHardwareSerial, setNewHardwareSerial] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHardwareSerial) {
      toast.error("Please enter the new hardware serial");
      return;
    }
    setLoading(true);
    try {
      await deviceService.replaceHardware(oldDeviceId, newHardwareSerial);
      toast.success("Hardware replaced successfully!");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to replace hardware");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-text-secondary/10">
        <div className="p-6 border-b border-text-secondary/10 flex justify-between items-center bg-background/50">
          <h2 className="text-xl font-bold text-foreground flex items-center">
            <Server className="w-5 h-5 mr-2 text-primary" />
            Replace Hardware
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-foreground rounded-full hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-text-secondary">
            This will decommission the current device, revoke its license, and bind a new device to this organization.
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              New Hardware Serial <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newHardwareSerial}
              onChange={(e) => setNewHardwareSerial(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-text-secondary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              placeholder="e.g. SN-99999999"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground bg-background hover:bg-surface border border-text-secondary/20 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Replacement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
