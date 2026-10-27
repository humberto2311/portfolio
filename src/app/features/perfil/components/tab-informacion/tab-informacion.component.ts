import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilData } from '../../../../core/models/perfil.model';

@Component({
  selector: 'app-tab-informacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-informacion.component.html',
  styleUrls: ['./tab-informacion.component.scss']
})
export class TabInformacionComponent {
  @Input({ required: true }) perfil!: PerfilData;
}