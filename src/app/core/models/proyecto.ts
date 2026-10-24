export interface Proyecto {
  id: number;
  name: string;          // Antes 'nombre'
  description: string;   // Antes 'descripcion'
  cloneUrl: string;      // Antes 'urlRepositorio'
  homepage: string;
  imageUrl: string;
  lastCommitDate: string;      // Antes 'imagenUrl'
  stack: string[];       // Antes 'tecnologias'
  branches: string[];    // Antes 'ramaPrincipal' (ahora es un array)
}