"use client";

import { useState } from "react";
import { Megaphone, Search, Plus, Calendar, X, Loader2 } from "lucide-react";
import { hasAccess } from "@/lib/permissions";
import { authService } from "@/services/auth";
import { fetchRest } from "@/services/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Announcement {
  id: string;
  title: string;
  content: string;
  targetType: string;
  createdAt: string;
  author: {
    name: string;
    email: string;
    baseRole: string | null;
  }
}

export default function AnnouncementsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => authService.getUser()
  });

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: () => fetchRest("announcements")
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string, content: string, targetType: string }) => {
      return fetchRest("announcements", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setIsModalOpen(false);
      setNewTitle("");
      setNewContent("");
    }
  });

  const isMayor = hasAccess(user, "mayor");
  const isHRIS = hasAccess(user, "hr");
  const canCreate = isMayor || isHRIS || hasAccess(user, "announcements", "create");

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-fade-in relative">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Stay up to date with organization-wide news.</p>
        </div>
        
        {canCreate && (
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} /> New Announcement
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
        <Search size={20} style={{ color: 'var(--text-tertiary)', marginRight: '1rem' }} />
        <input 
          type="text" 
          placeholder="Search announcements..." 
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: '1rem' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div style={{display: 'flex', justifyContent: 'center', padding: '3rem'}}>
          <Loader2 className="animate-spin" style={{color: 'var(--accent-primary)'}} size={32} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredAnnouncements.map((ann) => (
            <div key={ann.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                <Calendar size={16} /> {new Date(ann.createdAt).toLocaleDateString()}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{ann.title}</h3>
                  <span style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                    {ann.author.name || ann.author.email.split('@')[0]}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                    • {ann.author.baseRole || 'Staff'}
                  </span>
                </div>
              </div>
              
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {ann.content}
              </p>
            </div>
          ))}

          {filteredAnnouncements.length === 0 && (
            <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)'}}>
              No announcements found.
            </div>
          )}
        </div>
      )}

      {/* Simple Create Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{margin: 0, fontSize: '1.25rem'}}>Create Announcement</h2>
              <button onClick={() => setIsModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'}}>
                <X size={20} />
              </button>
            </div>
            
            <div className="form-group">
              <label>Title</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Townhall Meeting" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
            </div>

            <div className="form-group" style={{marginTop: '1rem'}}>
              <label>Content</label>
              <textarea 
                className="form-input" 
                rows={4} 
                placeholder="Write your announcement details here..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                style={{resize: 'vertical'}}
              />
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem'}}>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer'}}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => createMutation.mutate({ title: newTitle, content: newContent, targetType: 'all' })}
                disabled={!newTitle || !newContent || createMutation.isPending}
              >
                {createMutation.isPending ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
