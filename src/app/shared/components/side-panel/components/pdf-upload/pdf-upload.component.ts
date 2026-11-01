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
      next: ({ jobId }) => this.esperarResultado(jobId, 0),
      error: (err) => {
        this.isUploading.set(false);
        this.errorMessage.set(this.mensajeDeError(err));
      }
    });
  }

  
  private esperarResultado(jobId: string, intentos: number) {
    // La IA puede tardar varios minutos: se espera hasta 10 min (300 x 2 s)
    if (intentos > 300) {
      this.isUploading.set(false);
      this.errorMessage.set('El proceso tardó demasiado. Intenta de nuevo o revisa el PDF.');
      return;
    }

    this.pdfService.getStatus(jobId).subscribe({
      next: (job) => {
        if (job.status === 'COMPLETED') {
          this.isUploading.set(false);
          this.selectedFile.set(null);
          this.uploadResult.set(job.result ?? null);
        } else if (job.status === 'FAILED') {
          this.isUploading.set(false);
          this.errorMessage.set(job.errorMessage || 'No se pudo procesar el PDF.');
        } else {
          setTimeout(() => this.esperarResultado(jobId, intentos + 1), 2000);
        }
      },
      error: () => {
        this.isUploading.set(false);
        this.errorMessage.set('No se pudo consultar el estado del procesamiento.');
      }
    });
  }

  private mensajeDeError(err: any): string {
    return err?.error?.error
      || err?.error?.message
      || (err?.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.' : '')
      || 'Error al procesar el PDF';
  }
}