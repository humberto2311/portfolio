import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingButtonsComponent } from './floating-buttons.component';

describe('FloatingButtonsComponent', () => {
  let component: FloatingButtonsComponent;
  let fixture: ComponentFixture<FloatingButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingButtonsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FloatingButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
