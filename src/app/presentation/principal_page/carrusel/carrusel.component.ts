import { Component } from '@angular/core';
import { ItemsComponent } from "../items/items.component";

@Component({
  selector: 'app-carrusel',
  standalone: true,
  imports: [ItemsComponent],
  templateUrl: './carrusel.component.html',
  styleUrl: './carrusel.component.scss'
})
export class CarruselComponent {

}
