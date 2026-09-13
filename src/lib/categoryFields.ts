export type CategoryFieldOptionGroup = { label: string; options: string[] };

export type CategoryFieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  /** When present the field renders as a grouped <select> instead of a text
   *  input. Free text would fragment the same department across "CSE", "cse",
   *  "Computer Sc." and make filtering useless. */
  optionGroups?: CategoryFieldOptionGroup[];
};

// Branch names are deliberately generic rather than one college's official
// department titles — colleges are added by email domain, so this list has to
// read correctly at the next campus too.
export const BOOK_DEPARTMENT_GROUPS: CategoryFieldOptionGroup[] = [
  {
    label: "Engineering",
    options: [
      "Computer Science",
      "Electronics & Communication",
      "Electrical",
      "Mechanical",
      "Civil",
      "Chemical",
      "Metallurgy & Materials",
      "Mining",
      "Biotechnology",
      "Ceramic",
      "Industrial Design",
      "Architecture",
    ],
  },
  {
    label: "Other",
    options: [
      "First year / Common",
      "Mathematics & Sciences",
      "Humanities & Management",
      "Competitive exams",
      "Fiction & general reading",
      "Other",
    ],
  },
];

export const ELECTRONICS_TYPE_GROUPS: CategoryFieldOptionGroup[] = [
  {
    label: "Computers & Tablets",
    options: ["Laptop", "Desktop / PC", "Tablet", "Monitor", "Keyboard / Mouse", "Printer"],
  },
  {
    label: "Phones & Wearables",
    options: ["Smartphone", "Smartwatch", "Charger / Cable", "Power Bank", "Phone Case / Screen Guard"],
  },
  {
    label: "Audio & Camera",
    options: ["Headphones / Earphones", "Speaker", "Camera"],
  },
  {
    label: "Other",
    options: ["Networking (Router / Modem)", "Other electronics"],
  },
];

export const APPLIANCE_TYPE_GROUPS: CategoryFieldOptionGroup[] = [
  {
    label: "Kitchen & Cooking",
    options: ["Electric Kettle", "Blender", "Egg Boiler"],
  },
  {
    label: "Cooling & Comfort",
    options: ["Table / Pedestal Fan", "Water Heater / Immersion Rod", "Room Heater"],
  },
  {
    label: "Cleaning & Personal Care",
    options: ["Iron / Steam Iron", "Hair Dryer / Trimmer"],
  },
  {
    label: "Lighting",
    options: ["Study Lamp"],
  },
];

export const CATEGORY_CUSTOM_FIELDS: Record<string, CategoryFieldDef[]> = {
  books: [
    { key: "department", label: "Department", optionGroups: BOOK_DEPARTMENT_GROUPS },
    { key: "isbn", label: "ISBN", placeholder: "e.g. 978-0134685991" },
    { key: "author", label: "Author", placeholder: "e.g. Joshua Bloch" },
  ],
  electronics: [
    { key: "type", label: "Type", optionGroups: ELECTRONICS_TYPE_GROUPS },
    { key: "brand", label: "Brand", placeholder: "e.g. Dell, Apple, boAt" },
    { key: "model", label: "Model", placeholder: "e.g. Inspiron 15" },
  ],
  cycles: [
    { key: "brand", label: "Brand", placeholder: "e.g. Hero, Firefox, Trek" },
    { key: "frame_size", label: "Frame size", placeholder: "e.g. 26 inch" },
  ],
  fashion: [{ key: "size", label: "Size", placeholder: "e.g. M, UK 9" }],
  stationery: [
    { key: "subject", label: "Subject / Course", placeholder: "e.g. CS2001, Thermodynamics" },
  ],
  "musical-instruments": [
    { key: "brand", label: "Brand", placeholder: "e.g. Yamaha, Fender" },
    { key: "instrument_type", label: "Type", placeholder: "e.g. Acoustic guitar, Keyboard" },
  ],
  gaming: [
    { key: "platform", label: "Platform", placeholder: "e.g. PS5, Xbox Series X, PC" },
  ],
  vehicles: [
    { key: "brand", label: "Brand", placeholder: "e.g. Honda, TVS" },
    { key: "model", label: "Model", placeholder: "e.g. Activa 6G" },
  ],
  appliances: [
    { key: "type", label: "Type", optionGroups: APPLIANCE_TYPE_GROUPS },
    { key: "brand", label: "Brand", placeholder: "e.g. Prestige, Philips" },
  ],
  coolers: [
    { key: "brand", label: "Brand", placeholder: "e.g. Symphony, Bajaj" },
    { key: "capacity", label: "Capacity", placeholder: "e.g. 20L, 50L, 70L" },
  ],
  calculators: [
    { key: "brand", label: "Brand", placeholder: "e.g. Casio, Texas Instruments" },
    { key: "model", label: "Model", placeholder: "e.g. fx-991ES" },
  ],
};

export function getCategoryFields(slug: string | undefined | null): CategoryFieldDef[] {
  if (!slug) return [];
  return CATEGORY_CUSTOM_FIELDS[slug] ?? [];
}

export function flattenOptions(groups: CategoryFieldOptionGroup[]): string[] {
  return groups.flatMap((g) => g.options);
}
