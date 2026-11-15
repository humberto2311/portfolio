import { Directive, HostListener, ElementRef, Renderer2, inject } from '@angular/core';

/**
 * Directive that adds animated press/click feedback to buttons and clickable elements.
 * Usage: <button appAnimatedButton>Click me</button>
 */
@Directive({
  selector: '[appAnimatedButton]',
  standalone: true,
})
export class AnimatedButtonDirective {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  private rippleEl: HTMLElement | null = null;

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onPress(event: MouseEvent | TouchEvent): void {
    this.createRipple(event);
    this.renderer.addClass(this.el.nativeElement, 'btn-pressed');
  }

  @HostListener('mouseup', ['$event'])
  @HostListener('mouseleave', ['$event'])
  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  onRelease(): void {
    this.renderer.removeClass(this.el.nativeElement, 'btn-pressed');
    this.removeRipple();
  }

  @HostListener('keydown.space', ['$event'])
  @HostListener('keydown.enter', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    this.handleKeyboardPress();
  }

  @HostListener('keyup.space', ['$event'])
  @HostListener('keyup.enter', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    this.onRelease();
    this.el.nativeElement.click();
  }

  private handleKeyboardPress(): void {
    this.renderer.addClass(this.el.nativeElement, 'btn-pressed');
    this.createKeyboardRipple();
  }

  private createRipple(event: MouseEvent | TouchEvent): void {
    const button = this.el.nativeElement;
    const rect = button.getBoundingClientRect();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    this.createRippleElement(x, y, button);
  }

  private createKeyboardRipple(): void {
    const button = this.el.nativeElement;
    const rect = button.getBoundingClientRect();
    const x = rect.width / 2;
    const y = rect.height / 2;
    this.createRippleElement(x, y, button);
  }

  private createRippleElement(x: number, y: number, button: HTMLElement): void {
    this.rippleEl = this.renderer.createElement('span');
    this.renderer.addClass(this.rippleEl, 'btn-ripple');
    this.renderer.setStyle(this.rippleEl, 'left', `${x}px`);
    this.renderer.setStyle(this.rippleEl, 'top', `${y}px`);
    this.renderer.setStyle(this.rippleEl, '--ripple-color', this.getRippleColor(button));
    this.renderer.appendChild(button, this.rippleEl);

    // Trigger reflow for animation
    if (this.rippleEl) {
      this.rippleEl.offsetHeight;
      this.renderer.addClass(this.rippleEl, 'btn-ripple--active');
    }
  }

  private removeRipple(): void {
    if (this.rippleEl) {
      this.renderer.addClass(this.rippleEl, 'btn-ripple--fade');
      setTimeout(() => {
        if (this.rippleEl && this.rippleEl.parentNode) {
          this.renderer.removeChild(this.rippleEl.parentNode, this.rippleEl);
        }
        this.rippleEl = null;
      }, 300);
    }
  }

  private getRippleColor(button: HTMLElement): string {
    const styles = window.getComputedStyle(button);
    const borderColor = styles.borderColor;
    const color = styles.color;

    // Use accent color if available, otherwise use border or text color
    if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
      return borderColor;
    }
    return color || 'rgba(74, 158, 255, 0.5)';
  }
}