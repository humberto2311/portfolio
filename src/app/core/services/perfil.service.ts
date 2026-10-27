import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, tap } from 'rxjs';
import { PerfilData, Publicacion } from '../models/perfil.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PerfilService {

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly API_URL = '/api/perfil';

  // ==== SIGNALS DE ESTADO ====
  perfil = signal<PerfilData | null>(null);
  publicaciones = signal<Publicacion[]>([]);
  cargando = signal<boolean>(false);

  private postCounter = 100;

  // Iniciales del usuario logueado (reactivo)
  private userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return '?';
    const partes = user.fullName.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  });

  // ==== API PÚBLICA ====

  cargarPerfil(): Observable<PerfilData> {
    this.cargando.set(true);

    // ⚠️ MOCK — Construimos el perfil con los datos reales del usuario
    const user = this.authService.currentUser();
    const mockPerfil: PerfilData = {
      nombre: user?.fullName || 'Usuario Invitado',
      rol: 'Backend Developer & Arquitecto de Software',
      estado: 'DISPONIBLE PARA NUEVOS RETOS',
      iniciales: this.userInitials(),
      bio: 'Especialista en desarrollo backend con Java...',
      contacto: {
        email: user?.email || 'correo@ejemplo.com',
        ubicacion: 'Bogotá, Colombia',
        github: 'github.com/usuario'
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

    return of(mockPerfil).pipe(
      delay(300),
      tap(data => {
        this.perfil.set(data);
        this.cargando.set(false);
      })
    );
  }

  cargarPublicaciones(): Observable<Publicacion[]> {
    const user = this.authService.currentUser();

    const mockPublicaciones: Publicacion[] = [
      {
        id: 1,
        autor: user?.fullName || 'Usuario Invitado',
        iniciales: this.userInitials(),
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

    return of(mockPublicaciones).pipe(
      delay(300),
      tap(data => this.publicaciones.set(data))
    );
  }

  crearPublicacion(texto: string, imagen?: string): void {
    const user = this.authService.currentUser();

    const nueva: Publicacion = {
      id: ++this.postCounter,
      autor: user?.fullName || 'Usuario',
      iniciales: this.userInitials(),
      tiempo: 'Hace un momento',
      texto,
      imagen,
      likes: 0,
      compartidos: 0,
      comentarios: []
    };
    this.publicaciones.update(list => [nueva, ...list]);
  }

  // 👇 Este era el método que faltaba
  toggleLike(postId: number): void {
    this.publicaciones.update(list =>
      list.map(p =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  }

  agregarComentario(postId: number, texto: string): void {
    const user = this.authService.currentUser();
    const autor = user?.fullName || 'Usuario';
    const iniciales = this.userInitials();

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