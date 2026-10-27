import { Component, inject } from '@angular/core';
import { SidePanelService } from '../../../../../core/services/side-panel.service';

@Component({
  selector: 'app-floating-buttons',
  standalone: true,
  templateUrl: './floating-buttons.component.html',
  styleUrls: ['./floating-buttons.component.scss'],
})
export class FloatingButtonsComponent {
  svc = inject(SidePanelService);
}