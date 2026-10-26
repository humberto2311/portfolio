import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OuthCallbackComponent } from './outh-callback.component';

describe('OuthCallbackComponent', () => {
  let component: OuthCallbackComponent;
  let fixture: ComponentFixture<OuthCallbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OuthCallbackComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OuthCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
