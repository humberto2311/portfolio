import { Component, inject } from '@angular/core';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { FloatingButtonsComponent } from './components/floating-buttons/floating-buttons.component';
import { ContactsListComponent } from './components/contacts-list/contacts-list.component';
import { ChatViewComponent } from './components/chat-view/chat-view.component';
import { PdfUploadComponent } from './components/pdf-upload/pdf-upload.component';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [FloatingButtonsComponent, ContactsListComponent, ChatViewComponent, PdfUploadComponent], 
  templateUrl: './side-panel.component.html',
  styleUrls: ['./side-panel.component.scss'],
})
export class SidePanelComponent {
  svc = inject(SidePanelService);
}