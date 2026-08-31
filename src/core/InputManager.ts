export interface InputState {
  up: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  secondaryFire: boolean;
  tertiaryFire: boolean;
  throttle?: number;
}

export type InputAction = 'up' | 'left' | 'right' | 'fire' | 'secondaryFire' | 'tertiaryFire';

export interface KeyBindings {
  up: string[];
  left: string[];
  right: string[];
  fire: string[];
  secondaryFire: string[];
  tertiaryFire: string[];
}

const DEFAULT_BINDINGS: KeyBindings = {
  up: ['KeyW', 'ArrowUp'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  fire: ['Space', 'Numpad0'],
  secondaryFire: ['KeyF', 'KeyE'],
  tertiaryFire: ['KeyR', 'ShiftRight'],
};

export class InputManager {
  private keys: Record<string, boolean> = {};
  public bindings: KeyBindings = { ...DEFAULT_BINDINGS };
  public gamepadIndex: number | null = null;
  public deadzone = 0.25;
  public enableAnalogThrust = true;
  public enableHaptics = true;

  constructor() {
    this.loadSettings();
    this.setupListeners();
    this.setupGamepadListeners();
  }

  public triggerHaptic(duration: number | number[] = 25): void {
    if (this.enableHaptics && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(duration);
      } catch {}
    }
  }

  public static formatKeyName(code?: string): string {
    if (!code) return '---';
    if (code === 'Space') return 'SPACE';
    if (code.startsWith('Key')) return code.slice(3).toUpperCase();
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
    if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
    if (code === 'ShiftLeft') return 'L-SHIFT';
    if (code === 'ShiftRight') return 'R-SHIFT';
    if (code === 'ControlLeft') return 'L-CTRL';
    if (code === 'ControlRight') return 'R-CTRL';
    if (code === 'AltLeft') return 'L-ALT';
    if (code === 'AltRight') return 'R-ALT';
    if (code === 'Enter') return 'ENTER';
    if (code === 'Tab') return 'TAB';
    if (code === 'Backspace') return 'BKSP';
    if (code === 'Delete') return 'DEL';
    return code.toUpperCase();
  }

  public getKeyPrompt(action: InputAction, isMobile: boolean): string {
    if (isMobile) {
      if (action === 'fire') return '[FIRE]';
      if (action === 'secondaryFire') return '[LAUNCH]';
      if (action === 'tertiaryFire') return '[SPECIAL]';
      if (action === 'up') return '[STEER]';
    }
    const keys = this.bindings[action];
    if (!keys || keys.length === 0) return '[KEY]';
    const primary = keys[0];
    if (primary === 'Space') return '[SPACE]';
    if (primary.startsWith('Key')) return `[${primary.slice(3)}]`;
    if (primary.startsWith('Arrow')) return `[${primary.slice(5).toUpperCase()}]`;
    if (primary === 'ShiftLeft' || primary === 'ShiftRight') return '[SHIFT]';
    return `[${primary.toUpperCase()}]`;
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('wh_keybindings');
      if (saved) {
        this.bindings = { ...DEFAULT_BINDINGS, ...JSON.parse(saved) };
      }
      const savedDz = localStorage.getItem('wh_deadzone');
      if (savedDz !== null) {
        this.deadzone = parseFloat(savedDz);
      }
      const savedAnalog = localStorage.getItem('wh_opt_analog_thrust');
      if (savedAnalog !== null) {
        this.enableAnalogThrust = savedAnalog === 'true';
      }
      const savedHaptics = localStorage.getItem('wh_opt_touch_haptics');
      if (savedHaptics !== null) {
        this.enableHaptics = savedHaptics === 'true';
      }
    } catch {
      this.bindings = { ...DEFAULT_BINDINGS };
    }
  }

  public saveBindings(): void {
    try {
      localStorage.setItem('wh_keybindings', JSON.stringify(this.bindings));
    } catch {}
  }

  public setDeadzone(val: number): void {
    this.deadzone = val;
    try {
      localStorage.setItem('wh_deadzone', val.toString());
    } catch {}
  }

  public resetBindings(): void {
    this.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
    this.saveBindings();
  }

  public setBinding(action: InputAction, keyCode: string): void {
    this.setBindingSlot(action, 0, keyCode);
  }

  public setBindingSlot(action: InputAction, slot: number, keyCode: string | null): void {
    if (!this.bindings[action]) this.bindings[action] = [];
    while (this.bindings[action].length < 2) {
      this.bindings[action].push('');
    }

    if (keyCode === null || keyCode === 'Escape' || keyCode === 'Delete' || keyCode === 'Backspace') {
      this.bindings[action][slot] = '';
    } else {
      // Clear key if it was bound in any other slot or action
      for (const act of Object.keys(this.bindings) as InputAction[]) {
        if (!this.bindings[act]) continue;
        this.bindings[act] = this.bindings[act].map((k, i) => (act === action && i === slot ? k : (k === keyCode ? '' : k)));
      }
      this.bindings[action][slot] = keyCode;
    }
    this.saveBindings();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      this.keys[e.code] = true;
      // Prevent default scrolling for game controls
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
    });
  }

  private setupGamepadListeners(): void {
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      this.gamepadIndex = e.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  public getGamepad(): Gamepad | null {
    if (this.gamepadIndex === null) return null;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    return gamepads[this.gamepadIndex] || null;
  }

  public isGamepadConnected(): boolean {
    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads ? navigator.getGamepads()[this.gamepadIndex] : null;
      return !!gp && gp.connected;
    }
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (gp && gp.connected) return true;
    }
    return false;
  }

  public getGamepadName(): string {
    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads ? navigator.getGamepads()[this.gamepadIndex] : null;
      if (gp && gp.connected) return gp.id || 'Controller';
    }
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (gp && gp.connected) return gp.id || 'Controller';
    }
    return 'None';
  }

  public getState(): InputState {
    const pad = this.getGamepad();

    // 1. Keyboard Inputs
    const isBound = (action: InputAction): boolean => {
      const codes = this.bindings[action] || [];
      return codes.some((code) => this.keys[code]);
    };

    let up = isBound('up');
    let left = isBound('left');
    let right = isBound('right');
    let fire = isBound('fire');
    let secondaryFire = isBound('secondaryFire');
    let tertiaryFire = isBound('tertiaryFire');
    let throttle = 1.0;

    // 2. Mobile Touch Inputs
    if (this.touchState.up) up = true;
    if (this.touchState.left) left = true;
    if (this.touchState.right) right = true;
    if (this.touchState.fire) fire = true;
    if (this.touchState.secondaryFire) secondaryFire = true;
    if (this.touchState.tertiaryFire) tertiaryFire = true;
    if (this.touchState.throttle !== undefined) throttle = this.touchState.throttle;

    // 3. Gamepad Integration
    if (pad) {
      // Left Stick X-axis
      const axisX = pad.axes[0] || 0;
      if (axisX < -this.deadzone) left = true;
      if (axisX > this.deadzone) right = true;

      // D-Pad
      if (pad.buttons[14]?.pressed) left = true;
      if (pad.buttons[15]?.pressed) right = true;

      // Right Trigger [RT / R2] or [A / Cross] for Thrust
      const rtValue = pad.buttons[7]?.value || 0;
      const aPressed = pad.buttons[0]?.pressed || false;
      if (rtValue > this.deadzone || aPressed) {
        up = true;
        if (this.enableAnalogThrust && rtValue > this.deadzone) {
          throttle = rtValue;
        }
      }

      // Button [X / Square] or [RB] for Primary Fire
      if (pad.buttons[2]?.pressed || pad.buttons[5]?.pressed) {
        fire = true;
      }

      // Button [B / Circle] or [LB] for Secondary Powerup / Hazard Launch
      if (pad.buttons[1]?.pressed || pad.buttons[4]?.pressed) {
        secondaryFire = true;
      }

      // Button [Y / Triangle] or [LT] for Tertiary Special Ability
      const ltValue = pad.buttons[6]?.value || 0;
      if (pad.buttons[3]?.pressed || ltValue > this.deadzone) {
        tertiaryFire = true;
      }
    }

    return {
      up,
      left,
      right,
      fire,
      secondaryFire,
      tertiaryFire,
      throttle,
    };
  }

  public touchState: InputState = {
    up: false,
    left: false,
    right: false,
    fire: false,
    secondaryFire: false,
    tertiaryFire: false,
    throttle: 1.0,
  };

  public setTouchAction(action: InputAction, active: boolean): void {
    this.touchState[action] = active;
  }

  public bindTouchButton(elementId: string, action: InputAction): void {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.setTouchAction(action, true);
      el.classList.add('touch-active');
      this.triggerHaptic(25);
    };

    const endHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.setTouchAction(action, false);
      el.classList.remove('touch-active');
    };

    el.addEventListener('pointerdown', startHandler);
    el.addEventListener('pointerup', endHandler);
    el.addEventListener('pointercancel', endHandler);
    el.addEventListener('touchstart', startHandler, { passive: false });
    el.addEventListener('touchend', endHandler, { passive: false });
    el.addEventListener('touchcancel', endHandler, { passive: false });
    el.addEventListener('mousedown', startHandler);
    el.addEventListener('mouseup', endHandler);
    el.addEventListener('mouseleave', endHandler);
  }

  public setupTouchSteerZone(
    zoneEl: HTMLElement,
    getShipAngle: () => number
  ): void {
    let activeTouchId: number | null = null;
    let originX = 0;
    let originY = 0;
    const stickNub = document.getElementById('touch-stick-nub');
    const stickBase = document.getElementById('touch-stick-base');

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - originX;
      const dy = clientY - originY;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        this.touchState.left = false;
        this.touchState.right = false;
        this.touchState.up = false;
        this.touchState.throttle = 0;
        if (stickNub) {
          stickNub.style.transform = 'translate(-50%, -50%)';
        }
        return;
      }

      // Visual nub positioning (clamped to 38px radius)
      if (stickNub) {
        const clampedDist = Math.min(dist, 38);
        const nx = (dx / dist) * clampedDist;
        const ny = (dy / dist) * clampedDist;
        stickNub.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
      }

      const targetAngle = Math.atan2(dy, dx);
      const shipAngle = getShipAngle();

      let diff = targetAngle - shipAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      this.touchState.left = diff < -0.12;
      this.touchState.right = diff > 0.12;

      if (this.enableAnalogThrust) {
        const analogThrottle = Math.max(0, Math.min(1.0, (dist - 10) / 30));
        this.touchState.throttle = analogThrottle;
        this.touchState.up = analogThrottle > 0.05;
      } else {
        this.touchState.throttle = 1.0;
        this.touchState.up = dist > 20;
      }
    };

    zoneEl.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (activeTouchId !== null) return;
        const t = e.changedTouches[0];
        activeTouchId = t.identifier;
        originX = t.clientX;
        originY = t.clientY;

        if (stickBase && stickNub) {
          stickBase.style.display = 'block';
          stickBase.style.left = `${originX}px`;
          stickBase.style.top = `${originY}px`;
          stickNub.style.transform = 'translate(-50%, -50%)';
        }
        e.preventDefault();
      },
      { passive: false }
    );

    zoneEl.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === activeTouchId) {
            handleMove(t.clientX, t.clientY);
            e.preventDefault();
            break;
          }
        }
      },
      { passive: false }
    );

    const resetTouch = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouchId = null;
          this.touchState.left = false;
          this.touchState.right = false;
          this.touchState.up = false;
          if (stickBase) stickBase.style.display = 'none';
          e.preventDefault();
          break;
        }
      }
    };

    zoneEl.addEventListener('touchend', resetTouch, { passive: false });
    zoneEl.addEventListener('touchcancel', resetTouch, { passive: false });
  }

  public isDown(code: string): boolean {
    return !!this.keys[code];
  }
}
