import { Component, inject, OnInit } from '@angular/core';
import { LoginModalComponent } from '../../../shared/components/login-modal/login-modal.component';
import { ModalService } from '../../../core/services/modal.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

@Component({
  selector: 'app-acceso-nativo',
  standalone: true,
  imports: [LoginModalComponent, LogoComponent],
  templateUrl: './acceso-nativo.component.html',
  styleUrls: ['./acceso-nativo.component.scss']
})
export class AccesoNativoComponent implements OnInit {
  private modalSvc = inject(ModalService);

  ngOnInit() {
    this.modalSvc.loginTab.set('login');
  }
}
