import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { LinkItem } from '../../../../core/models/LinkItem';
import { LinkHubService } from '../../../../core/services/link-hub.service';
import { EmpresaService } from '../../../../core/services/empresa.service';

type Ambito = 'personal' | 'empresa';

@Component({
  selector: 'app-tab-enlaces',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tab-enlaces.component.html',
  styleUrls: ['./tab-enlaces.component.scss'],
})
export class TabEnlacesComponent implements OnInit {
  private linkHub = inject(LinkHubService);
  private empresas = inject(EmpresaService);

  readonly personales = signal<LinkItem[]>([]);
  readonly deEmpresa = signal<LinkItem[]>([]);
  readonly cargando = signal(true);
  readonly ambito = signal<Ambito>('personal');
  readonly empresaNombre = signal('');

  ngOnInit(): void {
    this.linkHub
      .getAll()
      .pipe(catchError(() => of([])))
      .subscribe((lista) => this.personales.set(lista ?? []));

    this.empresas
      .cargarMis()
      .pipe(
        switchMap((mias) => {
          const empresa = mias[0];
          this.empresaNombre.set(empresa?.nombre ?? '');
          if (!empresa?.id) return of([] as LinkItem[]);
          return this.linkHub.getDeEmpresa(empresa.id).pipe(catchError(() => of([] as LinkItem[])));
        }),
        catchError(() => of([] as LinkItem[])),
      )
      .subscribe((deEmpresa) => {
        this.deEmpresa.set(deEmpresa ?? []);
        this.cargando.set(false);
      });
  }

  get lista(): LinkItem[] {
    return this.ambito() === 'empresa' ? this.deEmpresa() : this.personales();
  }

  cambiar(ambito: Ambito): void {
    this.ambito.set(ambito);
  }
}
