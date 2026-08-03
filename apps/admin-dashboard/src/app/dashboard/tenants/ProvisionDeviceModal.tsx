import { useState } from "react";
import { X, Server, Check } from "lucide-react";
import toast from "react-hot-toast";
import { deviceService } from "@/services/deviceService";
import { Tenant } from "@/services/tenantService";

interface ProvisionDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  onSuccess: () => void;
}

export function ProvisionDeviceModal({ isOpen, onClose, tenants, onSuccess }: ProvisionDeviceModalProps) {
  const [tenantId, setTenantId] = useState("");
  const [hardwareSerial, setHardwareSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairingToken, setPairingToken] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !hardwareSerial) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      // 1. Provision Device
      const device = await deviceService.provisionDevice(hardwareSerial);
      // 2. Bind Device
      const boundDevice = await deviceService.bindDevice(device.deviceId, tenantId);
      
      setPairingToken(boundDevice.pairingToken);
      toast.success("Device provisioned and bound successfully!");
      onSuccess();
      // Wait for user to dismiss the token display manually instead of onClose()
    } catch (e: any) {
      toast.error(e.message || "Failed to provision/bind device");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPairingToken(null);
    setTenantId("");
    setHardwareSerial("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-text-secondary/10">
        <div className="p-6 border-b border-text-secondary/10 flex justify-between items-center bg-background/50">
          <h2 className="text-xl font-bold text-foreground flex items-center">
            {pairingToken ? <Check className="w-5 h-5 mr-2 text-green-500" /> : <Server className="w-5 h-5 mr-2 text-primary" />}
            {pairingToken ? "Device Bound" : "Provision & Bind Device"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-text-secondary hover:text-foreground rounded-full hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {pairingToken ? (
          <div className="p-6 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Registration Required</h3>
              <p className="text-sm text-text-secondary mb-6">
                The device is bound to the organization. Please provide this 6-character Pairing PIN to the tenant administrator so they can activate the device on their end.
              </p>
              
              <div className="bg-background border border-primary/20 rounded-xl p-4 flex items-center justify-center">
                <span className="text-4xl font-mono font-bold tracking-[0.5em] text-primary select-all">
                  {pairingToken}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-3">
                This PIN will expire in 15 minutes. It has also been emailed to the sysadmin.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={handleClose}
                className="w-full inline-flex items-center justify-center px-4 py-3 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Select LGU Tenant <span className="text-red-500">*</span>
              </label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-text-secondary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                required
              >
                <option value="">Select an organization</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.psgcCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Hardware Serial <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={hardwareSerial}
                onChange={(e) => setHardwareSerial(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-text-secondary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                placeholder="e.g. SN-12345678"
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
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
                {loading ? "Processing..." : "Confirm Binding"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
