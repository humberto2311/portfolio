import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PrivateNavbarComponent } from './navbar/navbar.component';
import { SideNavComponent } from './side-nav/side-nav.component';
import { TabBarComponent } from './tab-bar/tab-bar.component';
import { SidePanelComponent } from '../../shared/components/side-panel/side-panel.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PrimerIngresoComponent } from './primer-ingreso/primer-ingreso.component';
import { RailStateService } from '../../core/services/rail-state.service';
import { TemaService } from '../../core/services/tema.service';
import { DisenoService } from '../../core/services/diseno.service';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, PrivateNavbarComponent, SideNavComponent, TabBarComponent, SidePanelComponent, FooterComponent, PrimerIngresoComponent],
  templateUrl: './private-layout.component.html',
  styleUrls: ['./private-layout.component.scss'],
})
export class PrivateLayoutComponent {
  readonly rail = inject(RailStateService);
  readonly anchoCompleto = signal(false);

  private readonly router = inject(Router);
  private readonly tema = inject(TemaService);
  private readonly diseno = inject(DisenoService);

  constructor() {
    this.leerRuta();
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.leerRuta());

    this.tema.pintar(this.tema.claro());
    this.diseno.cargarPropio().subscribe();
  }

  private leerRuta(): void {
    let rama = this.router.routerState.snapshot.root;
    while (rama.firstChild) {
      rama = rama.firstChild;
    }
    this.anchoCompleto.set(rama.data['anchoCompleto'] === true);
  }
}
