import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-politicas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './politicas.component.html',
  styleUrls: ['./politicas.component.scss']
})
export class PoliticasComponent {
  readonly vigencia = '5 de noviembre de 2026';
  readonly contacto = 'Humbertojoce@gmail.com';
}
