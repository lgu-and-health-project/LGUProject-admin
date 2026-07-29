"use client";
import React, { useEffect, useState } from "react";
import { authService, CurrentUser } from "@/services/auth";
import RequireModuleAccess from "@/components/guards/RequireModuleAccess";
import { Building2, MapPin, Map, Fingerprint, Landmark, Tag } from "lucide-react";

function ProfilePageContent() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [psgcData, setPsgcData] = useState<any>(null);
  const [loadingPsgc, setLoadingPsgc] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    authService.getUser().then((u) => {
      if (isMounted) {
        setUser(u);
        if (u?.orgCode) {
          const savedLogo = localStorage.getItem(`org_logo_${u.orgCode}`);
          if (savedLogo) setLogoUrl(savedLogo);
        }
      }
      
      if (u?.orgCode && isMounted) {
        setLoadingPsgc(true);
        const code = u.orgCode;
        const level = u.org?.level;
        
        let endpoint = "cities-municipalities";
        if (level === "region") endpoint = "regions";
        else if (level === "province") endpoint = "provinces";

        fetch(`https://psgc.gitlab.io/api/${endpoint}/${code}`)
          .then(res => res.ok ? res.json() : null)
          .then(async (data) => {
            if (!isMounted || !data) return;

            const displayData: any = {};
            
            if (level === "region") {
              displayData.classification = "Region";
              displayData.region = data.regionName || data.name;
            } else if (level === "province") {
              displayData.classification = "Province";
              displayData.province = data.name;
              if (data.regionCode) {
                try {
                  const r = await fetch(`https://psgc.gitlab.io/api/regions/${data.regionCode}`).then(res => res.json());
                  displayData.region = r.regionName || r.name;
                } catch (e) {}
              }
            } else {
              if (level === "city_huc") displayData.classification = "Highly Urbanized City (HUC)";
              else if (level === "city_icc") displayData.classification = "Independent Component City (ICC)";
              else if (level === "city_component") displayData.classification = "Component City";
              else if (level === "municipality") displayData.classification = "Municipality";
              else displayData.classification = data.isCity ? "City" : "Municipality";
              
              if (data.provinceCode) {
                try {
                  const p = await fetch(`https://psgc.gitlab.io/api/provinces/${data.provinceCode}`).then(res => res.json());
                  displayData.province = p.name;
                } catch (e) {}
              }
              if (data.regionCode) {
                try {
                  const r = await fetch(`https://psgc.gitlab.io/api/regions/${data.regionCode}`).then(res => res.json());
                  displayData.region = r.regionName || r.name;
                } catch (e) {}
              }
            }
            if (isMounted) setPsgcData(displayData);
          })
          .catch(console.error)
          .finally(() => {
            if (isMounted) setLoadingPsgc(false);
          });
      }
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h1 className="page-title">Organization Profile</h1>
        <p className="page-subtitle">
          View your Local Government Unit's official registry information.
        </p>
      </div>

      <div 
        className="card" 
        style={{ 
          overflow: "hidden", 
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)'
        }}
      >
        {/* Banner Section */}
        <div 
          style={{
            height: '120px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%)',
            position: 'relative'
          }}
        >
          <input 
            type="file" 
            accept="image/*" 
            id="logo-upload" 
            style={{ display: 'none' }} 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const url = reader.result as string;
                  setLogoUrl(url);
                  if (user?.orgCode) {
                    localStorage.setItem(`org_logo_${user.orgCode}`, url);
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <label
            htmlFor="logo-upload"
            style={{
              position: 'absolute',
              bottom: '-40px',
              left: '2rem',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-primary)',
              border: '4px solid var(--bg-primary)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            title="Update Organization Logo"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Organization Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Landmark size={40} />
            )}
            <div 
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'white',
                fontSize: '0.65rem',
                textAlign: 'center',
                padding: '2px 0',
                opacity: 0,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
              Update
            </div>
          </label>
        </div>

        {/* Content Section */}
        <div style={{ padding: '3.5rem 2rem 2rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user?.org?.name || "Loading..."}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                <Fingerprint size={16} />
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>PSGC: {user?.orgCode || "Loading..."}</span>
              </div>
            </div>
            
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent-primary)',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              <Building2 size={16} />
              {loadingPsgc ? "Loading..." : (psgcData?.classification || "Unknown Classification")}
            </div>
          </div>

          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: '1.5rem',
              backgroundColor: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 500 }}>
                <Map size={16} />
                Region
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {loadingPsgc ? "Loading..." : (psgcData?.region || "N/A")}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 500 }}>
                <MapPin size={16} />
                Province
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {loadingPsgc ? "Loading..." : (psgcData?.province || "N/A")}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 500 }}>
                <Tag size={16} />
                Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                <span style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)' }}>Active</span>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px dashed var(--border-color)', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Identity Synchronization</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This organization profile is synchronized with the central administration registry and corresponds directly to official PSGC (Philippine Standard Geographic Code) data. Any changes to the organization name, code, or hierarchy must be processed through the central platform administrators to maintain data integrity across the ecosystem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireModuleAccess moduleId="profile" action="read">
      <ProfilePageContent />
    </RequireModuleAccess>
  );
}
