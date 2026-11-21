import { Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PrivateNavbarComponent } from './navbar/navbar.component';
import { SideNavComponent } from './side-nav/side-nav.component';
import { TabBarComponent } from './tab-bar/tab-bar.component';
import { SidePanelComponent } from '../../shared/components/side-panel/side-panel.component';
import { ImportarCvComponent } from './importar-cv/importar-cv.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PrimerIngresoComponent } from './primer-ingreso/primer-ingreso.component';
import { MensajesPastillaComponent } from './mensajes-pastilla/mensajes-pastilla.component';
import { RailStateService } from '../../core/services/rail-state.service';
import { TemaService } from '../../core/services/tema.service';
import { DisenoService } from '../../core/services/diseno.service';
import { EmisoraNfcService } from '../../core/services/emisora-nfc.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { SidePanelService } from '../../core/services/side-panel.service';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, PrivateNavbarComponent, SideNavComponent, TabBarComponent, SidePanelComponent, FooterComponent, PrimerIngresoComponent, MensajesPastillaComponent, ImportarCvComponent],
  templateUrl: './private-layout.component.html',
  styleUrls: ['./private-layout.component.scss'],
})
export class PrivateLayoutComponent implements OnDestroy {
  readonly rail = inject(RailStateService);
  readonly anchoCompleto = signal(false);
  readonly empresa = inject(EmpresaService);

  private readonly router = inject(Router);
  private readonly tema = inject(TemaService);
  private readonly diseno = inject(DisenoService);
  private readonly emisora = inject(EmisoraNfcService);
  private readonly panel = inject(SidePanelService);

  constructor() {
    // Versiones anteriores guardaban "pastilla oculta" para siempre: se limpia.
    this.panel.limpiarPreferenciaAntigua();

    this.leerRuta();
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.leerRuta());

    this.tema.pintar(this.tema.claro());
    this.diseno.cargarPropio().subscribe();
    this.empresa.cargarMis().subscribe();
    void this.emisora.despertar();
  }

  ngOnDestroy(): void {
    void this.emisora.desarmar();
  }

  /** Cambia entre cuenta personal y empresa desde cualquier pantalla (también en móvil). */
  alternarCuenta(): void {
    if (this.empresa.enModoEmpresa()) {
      this.empresa.salir();
      void this.router.navigateByUrl('/app/perfil');
      return;
    }

    const destino = this.empresa.empresaActual() ?? this.empresa.listado()[0];
    if (destino) this.empresa.entrar(destino.id);
    void this.router.navigateByUrl('/app/empresa');
  }

  private leerRuta(): void {
    let rama = this.router.routerState.snapshot.root;
    while (rama.firstChild) {
      rama = rama.firstChild;
    }
    this.anchoCompleto.set(rama.data['anchoCompleto'] === true);
  }
}
