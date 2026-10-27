import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { SidePanelComponent } from '../../shared/components/side-panel/side-panel.component';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidePanelComponent],
  templateUrl: './private-layout.component.html',
  styleUrls: ['./private-layout.component.scss'],
})
export class PrivateLayoutComponent {}