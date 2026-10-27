import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabFotosComponent } from './tab-fotos.component';

describe('TabFotosComponent', () => {
  let component: TabFotosComponent;
  let fixture: ComponentFixture<TabFotosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabFotosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TabFotosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
