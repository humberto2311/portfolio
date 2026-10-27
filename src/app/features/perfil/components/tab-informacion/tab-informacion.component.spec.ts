import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabInformacionComponent } from './tab-informacion.component';

describe('TabInformacionComponent', () => {
  let component: TabInformacionComponent;
  let fixture: ComponentFixture<TabInformacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabInformacionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TabInformacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
