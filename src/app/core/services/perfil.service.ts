import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, tap } from 'rxjs';
import { PerfilData, Publicacion } from '../models/perfil.model';

@Injectable({ providedIn: 'root' })
export class PerfilService {

  private http = inject(HttpClient);

  // Endpoint real (aún no implementado en backend)
  private readonly API_URL = '/api/perfil';

  // ==== SIGNALS DE ESTADO ====
  perfil = signal<PerfilData | null>(null);
  publicaciones = signal<Publicacion[]>([]);
  cargando = signal<boolean>(false);

  private postCounter = 100;

  // ============================================================
  // ⚠️ MOCK — ELIMINAR CUANDO EL BACKEND ESTÉ LISTO
  // ============================================================
  private readonly MOCK_PERFIL: PerfilData = {
    nombre: 'Humberto Lozano',
    rol: 'Backend Developer & Arquitecto de Software',
    estado: 'DISPONIBLE PARA NUEVOS RETOS',
    iniciales: 'HL',
    bio: 'Especialista en desarrollo backend con Java, Spring Boot y Arquitectura Hexagonal. Enfoque en microservicios, código limpio y rendimiento optimizado.',
    contacto: {
      email: 'humberto@nfcsoft.com',
      ubicacion: 'Bogotá, Colombia',
      github: 'github.com/humberto2311'
    },
    experiencia: [
      {
        puesto: 'Backend Developer',
        empresa: 'Security Cast S.A.S',
        periodo: 'Jun 2025 - Ago 2026',
        detalles: 'Desarrollo de servicios enterprise Java backend usando Hexagonal Architecture, microservicios y generación automatizada de reportes.'
      },
      {
        puesto: 'Backend Developer',
        empresa: 'LYC Soluciones Empresariales',
        periodo: 'Oct 2023 - Dic 2024',
        detalles: 'Construcción de APIs RESTful con Java, Spring Boot, Data JPA, Spring Security y Hibernate.'
      }
    ],
    estudios: [
      {
        titulo: 'Postgrado / Especialización en Software Engineering',
        institucion: 'Universidad Tecnológica de Bolívar',
        periodo: '2026 - Presente'
      },
      {
        titulo: 'Ingeniero de Sistemas y Tecnólogo en Desarrollo de Software',
        institucion: 'Tecnológico Comfenalco',
        periodo: '2026'
      }
    ],
    pilaTecnologica: [
      { categoria: 'Backend', tecnologias: ['Java 21', 'Spring Boot', 'Spring Security', 'Hibernate/JPA', 'Microservicios', 'Arquitectura Hexagonal'] },
      { categoria: 'Bases de Datos', tecnologias: ['PostgreSQL', 'MySQL', 'Oracle DB', 'Liquibase'] },
      { categoria: 'Frontend & Móvil', tecnologias: ['Angular', 'TypeScript', 'Flutter', 'Dart', 'Android Kotlin'] },
      { categoria: 'Herramientas & DevOps', tecnologias: ['Docker', 'Git', 'Postman', 'IntelliJ IDEA', 'DBeaver', 'Swagger/OpenAPI'] }
    ],
    proyectos: [
      {
        titulo: 'NFC-Soft',
        descripcion: 'Plataforma de identidad digital y networking con autenticación OAuth2, Spring Security, JWT y Angular.',
        tags: ['Java', 'Spring Boot', 'Angular', 'NFC']
      },
      {
        titulo: 'recharges-tuLlave',
        descripcion: 'Servicio backend para recargas de tarjetas de transporte masivo bajo Arquitectura Hexagonal.',
        tags: ['Java 21', 'Spring Boot', 'Hexagonal', 'PostgreSQL']
      }
    ],
    fotos: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&auto=format&fit=crop&q=80'
    ],
    contactos: [
      { nombre: 'Ana Ramírez', rol: 'UX Designer', iniciales: 'AR' },
      { nombre: 'Carlos Ruiz', rol: 'Backend Lead', iniciales: 'CR' },
      { nombre: 'Sofía Gómez', rol: 'Frontend Dev', iniciales: 'SG' }
    ]
  };

  private readonly MOCK_PUBLICACIONES: Publicacion[] = [
    {
      id: 1,
      autor: 'Humberto Lozano',
      iniciales: 'HL',
      tiempo: 'Hace 2 horas',
      texto: 'Actualización completada ⚡ Se integró el nuevo sistema de perfil en arquitectura Cyber Dark sin barras innecesarias. Totalmente responsivo y listo para producción. #NFCSoft #CyberpunkUI #WebDev',
      imagen: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      likes: 28,
      compartidos: 5,
      comentarios: [
        {
          id: 1,
          autor: 'Carlos Ruiz',
          iniciales: 'CR',
          texto: '¡Quedó impresionante la interfaz! El diseño neón resalta bastante bien.'
        }
      ]
    }
  ];
  // ============================================================
  // ⚠️ FIN DEL MOCK
  // ============================================================

  // ==== API PÚBLICA ====

  /**
   * Carga el perfil. Actualmente usa MOCK, pero la firma
   * ya está preparada para hacer GET al endpoint real.
   *
   * Para conectar el backend solo cambia `of(this.MOCK_PERFIL)`
   * por `this.http.get<PerfilData>(this.API_URL)`.
   */
  cargarPerfil(): Observable<PerfilData> {
    this.cargando.set(true);

    // ⚠️ MOCK — reemplazar por:
    // return this.http.get<PerfilData>(this.API_URL).pipe(
    //   tap(data => { this.perfil.set(data); this.cargando.set(false); })
    // );
    return of(this.MOCK_PERFIL).pipe(
      delay(300),
      tap(data => {
        this.perfil.set(data);
        this.cargando.set(false);
      })
    );
  }

  /**
   * Carga el feed de publicaciones.
   */
  cargarPublicaciones(): Observable<Publicacion[]> {
    // ⚠️ MOCK — reemplazar por:
    // return this.http.get<Publicacion[]>(`${this.API_URL}/publicaciones`).pipe(
    //   tap(data => this.publicaciones.set(data))
    // );
    return of(this.MOCK_PUBLICACIONES).pipe(
      delay(300),
      tap(data => this.publicaciones.set(data))
    );
  }

  crearPublicacion(texto: string, imagen?: string): void {
    // ⚠️ MOCK — reemplazar por POST al backend
    const nueva: Publicacion = {
      id: ++this.postCounter,
      autor: this.perfil()?.nombre ?? 'Humberto Lozano',
      iniciales: this.perfil()?.iniciales ?? 'HL',
      tiempo: 'Hace un momento',
      texto,
      imagen,
      likes: 0,
      compartidos: 0,
      comentarios: []
    };
    this.publicaciones.update(list => [nueva, ...list]);
  }

  toggleLike(postId: number): void {
    // ⚠️ MOCK — reemplazar por POST/DELETE al backend
    this.publicaciones.update(list =>
      list.map(p =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  }

  agregarComentario(postId: number, texto: string): void {
    // ⚠️ MOCK — reemplazar por POST al backend
    const autor = this.perfil()?.nombre ?? 'Humberto Lozano';
    const iniciales = this.perfil()?.iniciales ?? 'HL';
    this.publicaciones.update(list =>
      list.map(p =>
        p.id === postId
          ? {
              ...p,
              comentarios: [
                ...p.comentarios,
                { id: Date.now(), autor, iniciales, texto }
              ]
            }
          : p
      )
    );
  }
}