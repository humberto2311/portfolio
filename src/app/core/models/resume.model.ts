export interface ResumeItem {
  id?: number;
  content: any; 
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
  items?: ResumeItem[]; 
}

export interface ResumeProfile {
  id?: number;
  userProfileId?: string;
  fullName?: string;           
  headline?: string;
  summary?: string;
  shortBio?: string;
  avatarUrl?: string;
  photoUrl?: string;         
  resumePdfUrl?: string;
  email?: string;
  phone?: string;
  location?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  publicSlug?: string;
  isPublic?: boolean;          
}