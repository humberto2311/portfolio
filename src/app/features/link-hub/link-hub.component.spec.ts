import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkHubComponent } from './link-hub.component';

describe('LinkHubComponent', () => {
  let component: LinkHubComponent;
  let fixture: ComponentFixture<LinkHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkHubComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LinkHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
