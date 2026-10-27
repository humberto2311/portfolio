import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilTabsComponent } from './perfil-tabs.component';

describe('PerfilTabsComponent', () => {
  let component: PerfilTabsComponent;
  let fixture: ComponentFixture<PerfilTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilTabsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PerfilTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
