"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/services/apiClient";
import { authService } from "@/services/auth";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, ShieldCheck, User } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [userId, setUserId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // We fetch the current user's details. Since we have the token, we can get it from authService
    // However, authService only stores basic info. We might want to fetch from /admins if needed
    // Actually, we can get our ID from token, but wait, do we have an endpoint for /me? 
    // If not, we can just fetch all admins and filter by our ID.
    const loadProfile = async () => {
      try {
        const currentUser = authService.getUser();
        if (!currentUser) return;
        
        setUserRole(currentUser.role);
        setUserId(currentUser.sub);

        // Fetch our own profile from /admins by filtering
        const allAdmins = await fetchApi<any[]>("/admins");
        const me = allAdmins.find(a => a.id === currentUser.sub);
        if (me) {
          setFormData(prev => ({
            ...prev,
            fullName: me.fullName,
            email: me.email,
          }));
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatePayload: any = {
        fullName: formData.fullName,
      };
      if (formData.password.trim() !== "") {
        updatePayload.password = formData.password;
      }

      await fetchApi(`/admins/${userId}`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });

      toast.success("Profile updated successfully!");
      setFormData(prev => ({ ...prev, password: "" })); // clear password field
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await fetchApi(`/admins/${userId}`, { method: "DELETE" });
      authService.logout();
      router.push("/login");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 w-full relative">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Account Settings</h1>
        <p className="text-text-secondary text-sm mt-1">
          Manage your personal profile and account security.
        </p>
      </header>

      <div className="bg-surface rounded-2xl border border-text-secondary/10 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-text-secondary/10 bg-background/50 flex items-center">
          <User className="w-5 h-5 mr-2 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Full Name</label>
              <input
                required
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-text-secondary/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Email Address</label>
              <input
                disabled
                type="email"
                value={formData.email}
                className="w-full px-4 py-2.5 rounded-lg bg-background/50 border border-text-secondary/20 text-text-secondary cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-text-secondary/10">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
              Change Password
            </h4>
            <div className="max-w-md space-y-2">
              <input
                type="password"
                placeholder="Enter new password (leave blank to keep current)"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-text-secondary/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {userRole !== "ROOT_SUPERADMIN" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl shadow-sm overflow-hidden p-6">
          <h3 className="text-lg font-bold text-red-700 flex items-center mb-2">
            <Trash2 className="w-5 h-5 mr-2" />
            Danger Zone
          </h3>
          <p className="text-sm text-red-600 mb-5 max-w-2xl">
            Deleting your account is a permanent action. You will immediately lose access to the administrator dashboard and your session will be terminated.
          </p>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
          >
            Delete My Account
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you absolutely sure you want to delete your own account? This action cannot be undone and you will be logged out immediately."
        confirmText="Yes, delete my account"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
