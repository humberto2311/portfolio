import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilHeaderComponent } from './perfil-header.component';

describe('PerfilHeaderComponent', () => {
  let component: PerfilHeaderComponent;
  let fixture: ComponentFixture<PerfilHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilHeaderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PerfilHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
