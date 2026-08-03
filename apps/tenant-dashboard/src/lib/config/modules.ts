// Single source of truth for module/tab metadata on the frontend.
//
// These ids MUST match tenant-api/prisma/module-registry.ts exactly — that
// file seeds the Module table and RolePermission rows the "read" flags below
// are checked against. If you add a module here, add it there too.
//
// Icons are deliberately NOT stored here — config data shouldn't hold React
// components. See lib/config/icons.ts for the id -> icon mapping.

export interface Subgroup {
  id: string;
  name: string;
  office?: string;
}

export interface ModuleTab {
  id: string;
  name: string;
  path: string;
  subgroups: Subgroup[];
}

export const COMMON_MODULES: ModuleTab[] = [
  { id: "dashboard", name: "Dashboard", path: "/", subgroups: [] },
  { id: "my-hr", name: "My HR Records", path: "/my-hr", subgroups: [] },
  { id: "announcements", name: "Announcements", path: "/announcements", subgroups: [] },
];

export const ADMIN_MODULES: ModuleTab[] = [
  { id: "profile", name: "Organization Profile", path: "/profile", subgroups: [] },
  { id: "staff", name: "Staff Directory", path: "/staff", subgroups: [] },
  { id: "roles", name: "Role Manager", path: "/roles", subgroups: [] },
  { id: "miso", name: "MISO Operations", path: "/miso", subgroups: [] },
];

export const LGU_MODULES: ModuleTab[] = [
  {
    id: "financial",
    name: "Financial",
    path: "/financial",
    subgroups: [
      { id: "budgeting", name: "Budgeting", office: "MBO" },
      { id: "treasury", name: "Treasury / Collections", office: "MTO" },
      { id: "accounting", name: "Accounting / Disbursement", office: "Accounting Office" },
    ],
  },
  {
    id: "assessment",
    name: "Assessment",
    path: "/assessment",
    subgroups: [
      { id: "real-property", name: "Real Property Assessment" },
      { id: "tax-mapping", name: "Tax Mapping", office: "Assessor's Office" },
    ],
  },
  {
    id: "planning",
    name: "Planning and Development",
    path: "/planning",
    subgroups: [
      { id: "development-planning", name: "Development Planning" },
      { id: "project-monitoring", name: "Project Monitoring", office: "MPDO" },
    ],
  },
  {
    id: "engineering",
    name: "Engineering",
    path: "/engineering",
    subgroups: [
      { id: "infrastructure", name: "Infrastructure Projects" },
      { id: "building-permits", name: "Building Permits", office: "MEO" },
    ],
  },
  {
    id: "health",
    name: "Health Records",
    path: "/health",
    subgroups: [
      { id: "patient-records", name: "Patient Records" },
      { id: "immunization", name: "Immunization Programs" },
      { id: "program-monitoring", name: "Health Program Monitoring", office: "MHO" },
    ],
  },
  {
    id: "registry",
    name: "Civil Registry",
    path: "/registry",
    subgroups: [
      { id: "birth-records", name: "Birth Records" },
      { id: "marriage-records", name: "Marriage Records" },
      { id: "death-records", name: "Death Records", office: "MCRO" },
    ],
  },
  {
    id: "legislative",
    name: "Legislative / Sanggunian Records",
    path: "/legislative",
    subgroups: [
      { id: "ordinances", name: "Ordinances and Resolutions" },
      { id: "session-records", name: "Session Records", office: "Secretary to the Sanggunian" },
    ],
  },
  {
    id: "hr",
    name: "Personnel/HR",
    path: "/hr",
    subgroups: [
      { id: "recruitment", name: "Recruitment and Appointments" },
      { id: "leave-attendance", name: "Leave and Attendance" },
      { id: "personnel-records", name: "Personnel Records", office: "HRMO" },
    ],
  },
  {
    id: "welfare",
    name: "Social Welfare",
    path: "/welfare",
    subgroups: [
      { id: "case-management", name: "Case Management" },
      { id: "aid-assistance", name: "Aid and Assistance Programs" },
      { id: "senior-pwd", name: "Senior Citizen / PWD Registry", office: "MSWDO" },
    ],
  },
  {
    id: "general-services",
    name: "General Services",
    path: "/general-services",
    subgroups: [
      { id: "procurement", name: "Procurement" },
      { id: "facilities-asset", name: "Facilities and Asset Management", office: "GSO" },
    ],
  },
  {
    id: "agriculture",
    name: "Agriculture",
    path: "/agriculture",
    subgroups: [
      { id: "farmer-registry", name: "Farmer Registry (RSBSA)" },
      { id: "extension-programs", name: "Extension Programs", office: "Agriculturist's Office" },
    ],
  },
  {
    id: "environment",
    name: "Environment and Natural Resources",
    path: "/environment",
    subgroups: [
      { id: "permits-clearances", name: "Environmental Permits and Clearances", office: "MENRO" },
      { id: "waste-management", name: "Solid Waste Management" },
    ],
  },
  {
    id: "disaster",
    name: "Disaster Response",
    path: "/disaster",
    subgroups: [
      { id: "incident-reporting", name: "Incident Reporting" },
      { id: "evacuation-relief", name: "Evacuation and Relief Operations", office: "MDRRMO" },
    ],
  },
  {
    id: "peace-safety",
    name: "Peace, Safety and Traffic",
    path: "/peace-safety",
    subgroups: [
      { id: "traffic-management", name: "Traffic Management" },
      { id: "peace-order", name: "Peace and Order Reports", office: "MPSTMO" },
    ],
  },
  {
    id: "economic-dev",
    name: "Local Economic Development",
    path: "/economic-dev",
    subgroups: [
      { id: "business-permits", name: "Business Permits and Licensing" },
      { id: "investment-promotion", name: "Investment Promotion", office: "LEDO" },
    ],
  },
];

export const ALL_MODULES: ModuleTab[] = [...COMMON_MODULES, ...ADMIN_MODULES, ...LGU_MODULES];

export function getModuleById(id: string): ModuleTab | undefined {
  return ALL_MODULES.find((m) => m.id === id);
}
