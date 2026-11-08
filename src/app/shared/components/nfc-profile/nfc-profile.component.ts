import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ModalService } from '../../../core/services/modal.service';

export interface DeveloperProfile {
  name: string;
  role: string;
  username: string;
  github: string;
}

@Component({
  selector: 'app-nfc-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './nfc-profile.component.html',
  styleUrl: './nfc-profile.component.scss'
})
export class NfcProfileComponent {
  private modalSvc = inject(ModalService);

  cardTransform = 'rotateX(0deg) rotateY(0deg)';
  isScanning = false;
  scanSuccess = false;

  readonly profile: DeveloperProfile = {
    name: 'Humberto Lozano Verbel',
    role: 'Desarrollador full stack',
    username: 'humberto2311',
    github: 'https://github.com/humberto2311'
  };

  abrirLogin(tab: 'login' | 'register' = 'register') {
    this.modalSvc.openLogin(tab);
  }

  scrollToGit(): void {
    const el = document.getElementById('como-funciona');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

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

  triggerTapScan(): void {
    if (this.isScanning) return;
    this.isScanning = true;
    this.scanSuccess = false;

    try {
      const audioCtx = new AudioContext();
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
}
