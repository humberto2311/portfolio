import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidePanelService } from '../../../../../core/services/side-panel.service';
import { Contact } from '../../../../../core/models/contact.model';

@Component({
  selector: 'app-contacts-list',
  standalone: true,
  imports: [ FormsModule],
  templateUrl: './contacts-list.component.html',
  styleUrls: ['./contacts-list.component.scss'],
})
export class ContactsListComponent {
  svc = inject(SidePanelService);
  search = signal('');

  get filtered(): Contact[] {
    const q = this.search().toLowerCase();
    return this.svc.contacts().filter(
      c => c.name.toLowerCase().includes(q) || c.lastMsg.toLowerCase().includes(q)
    );
  }

  select(contact: Contact): void {
    this.svc.openChat(contact);
  }

  onSearch(value: string): void {
    this.search.set(value);
  }
}