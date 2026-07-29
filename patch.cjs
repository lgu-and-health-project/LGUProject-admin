const fs = require('fs');
const file = 'apps/admin-dashboard/src/app/dashboard/tenants/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace fetchPsgc
content = content.replace(
`    const fetchPsgc = async () => {
      setPsgcLoading(true);
      try {
        let endpoint = "";
        if (formData.level === "province") endpoint = "/provinces";
        else if (formData.level === "city" || formData.level === "municipality") endpoint = "/cities-municipalities";
        
        if (!endpoint) return;
        
        if (psgcCache[endpoint]) {
          if (isMounted) setPsgcOptions(psgcCache[endpoint]);
        } else {
          const res = await fetch(\`https://psgc.cloud/api/v2\${endpoint}\`, {
            headers: { 'Accept': 'application/json' }
          });
          if (!res.ok) throw new Error(\`HTTP error! status: \${res.status}\`);
          
          const json = await res.json();
          const data = Array.isArray(json) ? json : (json.data || []);
          
          if (formData.level === "city") {
             // Optional: Filter for cities if we want to be strict, but keeping both is fine for search
             psgcCache[endpoint] = data;
          } else {
             psgcCache[endpoint] = data;
          }
          
          if (isMounted) setPsgcOptions(data);
        }
      } catch (err) {
        console.error("Failed to fetch PSGC data", err);
        if (isMounted) setPsgcOptions([]);
      } finally {
        if (isMounted) setPsgcLoading(false);
      }
    };
    
    fetchPsgc();
    
    return () => { isMounted = false; };
  }, [formData.level, isModalOpen]);`,
`    const fetchPsgc = async () => {
      setPsgcLoading(true);
      try {
        if (psgcCache['all']) {
          if (isMounted) setPsgcOptions(psgcCache['all']);
        } else {
          const [regionsRes, provincesRes, cmRes] = await Promise.all([
            fetch('https://psgc.gitlab.io/api/regions'),
            fetch('https://psgc.gitlab.io/api/provinces'),
            fetch('https://psgc.gitlab.io/api/cities-municipalities')
          ]);
          
          const regions = await regionsRes.json();
          const provinces = await provincesRes.json();
          const cms = await cmRes.json();
          
          const regionMap = regions.reduce((acc, r) => ({ ...acc, [r.code]: r.regionName || r.name }), {});
          const provinceMap = provinces.reduce((acc, p) => ({ ...acc, [p.code]: p.name }), {});
          
          const formattedRegions = regions.map((r) => ({
            code: r.code,
            name: \`Region of \${r.name}\`,
            level: 'region'
          }));
          
          const formattedProvinces = provinces.map((p) => ({
            code: p.code,
            name: \`Province of \${p.name}, \${regionMap[p.regionCode] || ''}\`,
            level: 'province'
          }));
          
          const formattedCms = cms.map((c) => {
            const type = c.isCity ? 'City' : 'Municipality';
            const provName = provinceMap[c.provinceCode] ? \`\${provinceMap[c.provinceCode]}, \` : '';
            return {
              code: c.code,
              name: \`\${type} of \${c.name}, \${provName}\${regionMap[c.regionCode] || ''}\`,
              level: c.isCity ? 'city' : 'municipality'
            };
          });
          
          const combined = [...formattedRegions, ...formattedProvinces, ...formattedCms];
          psgcCache['all'] = combined;
          if (isMounted) setPsgcOptions(combined);
        }
      } catch (err) {
        console.error("Failed to fetch PSGC data", err);
        if (isMounted) setPsgcOptions([]);
      } finally {
        if (isMounted) setPsgcLoading(false);
      }
    };
    
    fetchPsgc();
    
    return () => { isMounted = false; };
  }, [isModalOpen]);`);

// Remove Level field
content = content.replace(
`              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Level
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      level: e.target.value,
                      name: "",
                      psgcCode: "",
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-text-secondary/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="province">Province</option>
                  <option value="city">City</option>
                  <option value="municipality">Municipality</option>
                </select>
              </div>`,
``);

// Update name placeholder
content = content.replace(
`placeholder={\`Enter \${formData.level} name...\`}`,
`placeholder="Enter LGU name (e.g. City of Manila)..."`);

// Update dropdown rendering
content = content.replace(
`                          <div className="font-semibold text-foreground">
                            {item.name}
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">
                            {formData.level === "province" && item.region}
                            {(formData.level === "city" ||
                              formData.level === "municipality") &&
                              \`\${item.type || formData.level}, \${item.province || item.region}\`}
                          </div>`,
`                          <div className="font-semibold text-foreground">
                            {item.name}
                          </div>`);

// Update dropdown onClick
content = content.replace(
`                            setFormData({
                              ...formData,
                              name: item.name,
                              psgcCode: item.code,
                            });`,
`                            setFormData({
                              ...formData,
                              name: item.name,
                              level: item.level,
                              psgcCode: item.code,
                            });`);

fs.writeFileSync(file, content);
console.log('Patched');
