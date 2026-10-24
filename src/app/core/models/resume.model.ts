export interface ResumeItem {
  id?: number;
  content: any; // Aquí guardamos el JSONB (ej: { empresa, cargo, fecha })
  displayOrder: number;
  source?: string;
}

export interface ResumeSection {
  id?: number;
  sectionKey: string;
  title: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  items?: ResumeItem[]; // Angular lo llenará luego
}

export interface ResumeProfile {
  id?: number;
  fullName: string;
  shortBio?: string;
  headline: string;
  summary: string;
  email: string;
  phone: string;
  location: string;
  githubUrl: string;
  resumePdfUrl?: string;
  publicSlug?: string;
}