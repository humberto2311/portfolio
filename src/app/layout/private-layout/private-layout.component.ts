import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PrivateNavbarComponent } from './navbar/navbar.component';
import { SidePanelComponent } from '../../shared/components/side-panel/side-panel.component';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, PrivateNavbarComponent, SidePanelComponent],
  templateUrl: './private-layout.component.html',
  styleUrls: ['./private-layout.component.scss'],
})
export class PrivateLayoutComponent {}