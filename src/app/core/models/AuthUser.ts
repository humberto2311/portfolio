export interface AuthUser {
  id: string;
  fullName: string; 
  email: string;
  role: 'admin' | 'user';
  provider?: 'local' | 'github' | 'google' | 'microsoft';
  phone?: string;
  gender?: string;
  birthDate?: string;
  gitUsername?: string; 
}