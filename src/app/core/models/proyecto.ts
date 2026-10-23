export interface Proyecto {
  id: number;
  nombre: string;
  tag: string;
  imagenUrl: string;
  descripcion: string;
  ramaPrincipal: string;
  urlRepositorio: string;
  tecnologias: string[];
  codigoEjemplo: string;
}