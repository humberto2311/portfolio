import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ⚠️ IMPORTANTE: Ajusta las rutas de estos imports según tu estructura de carpetas
import { ProyectosService } from '../../../core/services/proyectos.service'; 
import { Proyecto } from '../../../core/models/proyecto';

export interface DeveloperProfile {
  name: string;
  nickname: string;
  role: string;
  bio: string;
  phone: string;
  email: string;
  github: string;
  linkedin: string;
}

@Component({
  selector: 'app-nfc-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nfc-profile.component.html',
  styleUrl: './nfc-profile.component.scss'
})
export class NfcProfileComponent implements OnInit {
  // Inyección del servicio
  private proyectosService = inject(ProyectosService);

  // Variables para la tarjeta NFC
  cardTransform = 'rotateX(0deg) rotateY(0deg)';
  isScanning = false;
  scanSuccess = false;

  // Variables para el estado de los repositorios de la API
  loadingRepos = true;
  reposError = false;
  gitRepos: Proyecto[] = [];

  // Datos del perfil para el formulario y el Hero
  profile: DeveloperProfile = {
    name: 'Humberto Lozano Verbel',
    nickname: 'Beto',
    role: 'Backend & Mobile Developer',
    bio: 'Especialista en desarrollo Java/Spring Boot, arquitecturas limpias y aplicaciones móviles Flutter. Creador del proyecto NFC-Soft.',
    phone: '+57 300 000 0000',
    email: 'beto@nfc-soft.dev',
    github: 'github.com/beto-dev',
    linkedin: 'linkedin.com/in/beto-dev'
  };

  // Al iniciar el componente, cargamos los repos
  ngOnInit(): void {
    this.loadRecentRepos();
  }

  // Método que soluciona el error de la imagen
  loadRecentRepos(): void {
    this.loadingRepos = true;
    this.reposError = false;

    this.proyectosService.getProyectos().subscribe({
      next: (repos) => {
        // Tomamos los primeros 4 proyectos
        this.gitRepos = repos.slice(0, 4);
        this.loadingRepos = false;
      },
      error: (err) => {
        console.error('Error cargando repos recientes:', err);
        this.reposError = true;
        this.loadingRepos = false;
      }
    });
  }

  // Lógica de la tarjeta 3D
  onCardTilt(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    this.cardTransform = `rotateX(${-y / 10}deg) rotateY(${x / 10}deg)`;
  }

  resetCardTilt(): void {
    this.cardTransform = 'rotateX(0deg) rotateY(0deg)';
  }

  // Lógica del escáner NFC simulado
  triggerTapScan(): void {
    if (this.isScanning) return;
    this.isScanning = true;
    this.scanSuccess = false;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch {}

    setTimeout(() => {
      this.isScanning = false;
      this.scanSuccess = true;
    }, 1200);
  }

  // Lógica para descargar el contacto .vcf
  exportVCard(): void {
    const p = this.profile;
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${p.name}\nTITLE:${p.role}\nTEL:${p.phone}\nEMAIL:${p.email}\nNOTE:NFC-Soft V1 Contact\nEND:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.nickname}_nfc_contact.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }
}