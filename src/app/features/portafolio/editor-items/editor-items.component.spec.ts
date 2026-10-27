import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorItemsComponent } from './editor-items.component';

describe('EditorItemsComponent', () => {
  let component: EditorItemsComponent;
  let fixture: ComponentFixture<EditorItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorItemsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditorItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
