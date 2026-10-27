import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactoRed } from '../../../../core/models/perfil.model';

@Component({
  selector: 'app-tab-contactos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-contactos.component.html',
  styleUrls: ['./tab-contactos.component.scss']
})
export class TabContactosComponent {
  @Input({ required: true }) contactos: ContactoRed[] = [];
}