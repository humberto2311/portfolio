import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfService, PdfImportResult } from '../../../../../core/services/pdf.service';

@Component({
  selector: 'app-pdf-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-upload.component.html',
  styleUrls: ['./pdf-upload.component.scss']
})
export class PdfUploadComponent {
  private pdfService = inject(PdfService);

  isDragging = signal(false);
  isUploading = signal(false);
  selectedFile = signal<File | null>(null);
  uploadResult = signal<PdfImportResult | null>(null);
  errorMessage = signal<string | null>(null);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: any) {
    if (event.target.files.length) {
      this.handleFile(event.target.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      this.errorMessage.set('Por favor, sube un archivo PDF válido.');
      return;
    }
    this.selectedFile.set(file);
    this.errorMessage.set(null);
    this.uploadResult.set(null);
  }

  upload() {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.errorMessage.set(null);

    this.pdfService.importPdf(file).subscribe({
      next: (res) => {
        this.uploadResult.set(res);
        this.isUploading.set(false);
        this.selectedFile.set(null);
      },
      error: (err) => {
        this.isUploading.set(false);
        // Aquí capturamos el mensaje de error del backend (ej. PDF rechazado por seguridad)
        this.errorMessage.set(err.error?.message || 'Error al procesar el PDF');
      }
    });
  }
}