import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { YouTubeService, VideoYouTube } from '../../../core/services/youtube.service';

@Component({
  selector: 'app-youtube-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './youtube-widget.component.html',
  styleUrls: ['./youtube-widget.component.scss']
})
export class YouTubeWidgetComponent implements OnInit {

  private youtube = inject(YouTubeService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);

  readonly estado = this.youtube.estado;
  readonly abierto = signal(false);
  readonly ocupado = signal(false);
  readonly consulta = signal('');
  readonly resultados = signal<VideoYouTube[]>([]);
  readonly buscando = signal(false);

  readonly video = computed(() => this.estado().video);
  readonly sonando = computed(() => this.estado().sonando && !!this.video());
  readonly visible = computed(() => !!this.video());

  readonly fuente = computed<SafeResourceUrl | null>(() => {
    const actual = this.video();
    if (!actual) return null;

    const url = `https://www.youtube.com/embed/${actual.id}?autoplay=1&rel=0&playsinline=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit(): void {
    this.youtube.actual().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => {} });
  }

  alternar(): void {
    this.abierto.update((v) => !v);
  }

  buscar(): void {
    const texto = this.consulta().trim();
    if (!texto || this.buscando()) return;

    this.buscando.set(true);
    this.youtube.buscar(texto, 6)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.resultados.set(lista);
          this.buscando.set(false);
        },
        error: () => {
          this.resultados.set([]);
          this.buscando.set(false);
        },
      });
  }

  poner(video: VideoYouTube): void {
    this.youtube.play(video.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  pausar(): void {
    this.youtube.pausar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  reanudar(): void {
    this.youtube.reanudar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  saltar(): void {
    this.youtube.saltar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  detener(): void {
    this.youtube.detener().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.abierto.set(false),
    });
  }
}
