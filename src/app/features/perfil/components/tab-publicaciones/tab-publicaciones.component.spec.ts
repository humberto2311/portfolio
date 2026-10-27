import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabPublicacionesComponent } from './tab-publicaciones.component';

describe('TabPublicacionesComponent', () => {
  let component: TabPublicacionesComponent;
  let fixture: ComponentFixture<TabPublicacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabPublicacionesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TabPublicacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
