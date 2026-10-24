import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NfcProfileComponent } from './nfc-profile.component';

describe('NfcProfileComponent', () => {
  let component: NfcProfileComponent;
  let fixture: ComponentFixture<NfcProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NfcProfileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NfcProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
