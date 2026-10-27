import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tab-fotos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-fotos.component.html',
  styleUrls: ['./tab-fotos.component.scss']
})
export class TabFotosComponent {
  @Input({ required: true }) fotos: string[] = [];
}