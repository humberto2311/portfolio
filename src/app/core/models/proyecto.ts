export interface UserProfile {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;

}

export interface Proyecto {
  id: number;
  name: string;
  description: string;
  shortBio: string;
  cloneUrl: string;
  homepage: string;
  imageUrl: string;
  lastCommitDate: string;
  stack: string[];
  branches: string[];
  userProfile?: UserProfile; // <-- Añadido aquí para solucionar el error
}