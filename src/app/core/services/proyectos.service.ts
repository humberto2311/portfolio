import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ComentarioProyecto,
  SocialProyecto,
  ProveedorOAuth,
  FuenteProyecto,
  ImportacionProyecto,
  Proyecto,
  ProjectSourceId
} from '../models/proyecto';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {

  private http = inject(HttpClient);
  private readonly API_CARDS = `${environment.apiUrl}/api/cards`;
  private readonly API_GITHUB = `${environment.apiUrl}/api/github`;
  private readonly API_PROJECTS = `${environment.apiUrl}/api/projects`;

  getProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.API_CARDS);
  }

  getPublicProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.API_CARDS}/public`);
  }

  getProyectosDeUsuario(username: string): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.API_CARDS}/usuario/${username}`);
  }

  updateProyecto(id: number, dto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.put<Proyecto>(`${this.API_CARDS}/${id}`, dto);
  }

  deleteProyecto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_CARDS}/${id}`);
  }

  importAllFromUser(gitUsername: string): Observable<Proyecto[]> {
    return this.http.post<Proyecto[]>(`${this.API_GITHUB}/import-user/${gitUsername}`, {});
  }

  toggleVisibility(id: number): Observable<Proyecto> {
    return this.http.patch<Proyecto>(`${this.API_CARDS}/${id}/visibility`, {});
  }

  buscarReposPublicosDeUsuario(username: string): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.API_GITHUB}/user/${username}/repos`);
  }

  importarTodoDeFuente(sourceType: ProjectSourceId, username: string): Observable<Proyecto[]> {
    return this.http.post<Proyecto[]>(`${this.API_PROJECTS}/import/all`, {
      sourceType,
      username
    });
  }

  /** Ticket de un solo uso para vincular GitLab: devuelve la URL del back a la que hay que navegar. */
  iniciarVinculoGitLab(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.API_PROJECTS}/gitlab/vincular`, {});
  }

  importarConCuentaConectada(sourceType: ProjectSourceId): Observable<Proyecto[]> {
    return this.http.post<Proyecto[]>(`${this.API_PROJECTS}/import/connected`, { sourceType });
  }

  getDescripcionProyecto(id: number): Observable<{ markdown: string; html: string }> {
    return this.http.get<{ markdown: string; html: string }>(
      `${environment.apiUrl}/api/projects/${id}/descripcion`);
  }

  guardarDescripcionProyecto(id: number, markdown: string): Observable<Proyecto> {
    return this.http.put<Proyecto>(
      `${environment.apiUrl}/api/projects/${id}/descripcion`, { markdown });
  }

  getSocialProyecto(id: number): Observable<SocialProyecto> {
    return this.http.get<SocialProyecto>(`${environment.apiUrl}/api/projects/${id}/social`);
  }

  alternarMeGustaProyecto(id: number): Observable<{ liked: boolean; likes: number }> {
    return this.http.post<{ liked: boolean; likes: number }>(
      `${environment.apiUrl}/api/projects/${id}/like`, {});
  }

  registrarVistaProyecto(id: number): Observable<{ views: number }> {
    return this.http.post<{ views: number }>(`${environment.apiUrl}/api/projects/${id}/view`, {});
  }

  getComentariosProyecto(id: number, page = 0, size = 20): Observable<{ content: ComentarioProyecto[] }> {
    return this.http.get<{ content: ComentarioProyecto[] }>(
      `${environment.apiUrl}/api/projects/${id}/comments`, { params: { page, size } });
  }

  comentarProyecto(id: number, content: string): Observable<ComentarioProyecto> {
    return this.http.post<ComentarioProyecto>(
      `${environment.apiUrl}/api/projects/${id}/comments`, { content });
  }

  borrarComentarioProyecto(id: number, commentId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/api/projects/${id}/comments/${commentId}`);
  }

  getProveedoresOAuth(): Observable<ProveedorOAuth[]> {
    return this.http.get<ProveedorOAuth[]>(`${environment.apiUrl}/api/auth/proveedores`);
  }

  getFuentes(): Observable<FuenteProyecto[]> {
    return this.http.get<FuenteProyecto[]>(`${this.API_PROJECTS}/sources`);
  }

  importarProyecto(dto: ImportacionProyecto): Observable<Proyecto> {
    return this.http.post<Proyecto>(`${this.API_PROJECTS}/import`, dto);
  }

  mostrarEnHub(id: number, visible: boolean): Observable<Proyecto> {
    return this.http.patch<Proyecto>(`${this.API_PROJECTS}/${id}/hub`, { visible });
  }

  registrarVistaEnHub(): Observable<{ id: string; url: string }> {
    return this.http.post<{ id: string; url: string }>(`${this.API_PROJECTS}/hub/view`, {});
  }

    fuenteSugerida(url: string): ProjectSourceId | null {
    const limpia = (url ?? '').toLowerCase().trim();
    if (!limpia) return null;

    if (limpia.includes('github.com')) return 'github';
    if (limpia.includes('gitlab.com')) return 'gitlab';
    if (limpia.includes('hub.docker.com') || limpia.includes('docker.io')) return 'docker_hub';
    if (limpia.includes('behance.net')) return 'behance';
    if (limpia.includes('dribbble.com')) return 'dribbble';
    if (limpia.includes('figma.com')) return 'figma';
    return null;
  }

  placeholderDe(fuente: ProjectSourceId): string {
    switch (fuente) {
      case 'github':
        return 'https://github.com/usuario/repositorio';
      case 'gitlab':
        return 'https://gitlab.com/grupo/proyecto';
      case 'docker_hub':
        return 'https://hub.docker.com/r/usuario/imagen';
      case 'behance':
        return 'https://www.behance.net/gallery/123456/proyecto';
      case 'dribbble':
        return 'https://dribbble.com/shots/1234567-shot';
      case 'figma':
        return 'https://www.figma.com/design/xxxxxxxx/mi-diseno';
      default:
        return 'https://mi-proyecto.com';
    }
  }
}
