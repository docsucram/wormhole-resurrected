export interface InputState {
  up: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  secondaryFire: boolean;
  tertiaryFire: boolean;
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
  up: ['ArrowUp', 'KeyW', 'Numpad8'],
  left: ['ArrowLeft', 'KeyA', 'Numpad4'],
  right: ['ArrowRight', 'KeyD', 'Numpad6'],
  fire: ['Space', 'Numpad0'],
  secondaryFire: ['KeyF', 'Numpad3', 'KeyE'],
  tertiaryFire: ['KeyR', 'KeyC', 'KeyV', 'ShiftLeft', 'ShiftRight'],
};

export class InputManager {
  private keys: Record<string, boolean> = {};
  public bindings: KeyBindings = { ...DEFAULT_BINDINGS };
  public gamepadIndex: number | null = null;
  public deadzone = 0.25;

  constructor() {
    this.loadSettings();
    this.setupListeners();
    this.setupGamepadListeners();
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
    if (!this.bindings[action]) this.bindings[action] = [];
    if (!this.bindings[action].includes(keyCode)) {
      this.bindings[action] = [keyCode]; // Replace primary binding
      this.saveBindings();
    }
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
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
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
    // 1. Keyboard Inputs
    const isActionDown = (action: InputAction): boolean => {
      const codes = this.bindings[action] || [];
      return codes.some((code) => !!this.keys[code]);
    };

    let up = isActionDown('up');
    let left = isActionDown('left');
    let right = isActionDown('right');
    let fire = isActionDown('fire');
    let secondaryFire = isActionDown('secondaryFire');
    let tertiaryFire = isActionDown('tertiaryFire');

    // 2. Xbox / Gamepad Inputs
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp: Gamepad | null = null;
    if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
      gp = gamepads[this.gamepadIndex];
    } else {
      for (const g of gamepads) {
        if (g && g.connected) {
          gp = g;
          break;
        }
      }
    }

    if (gp && gp.connected) {
      // Standard Xbox Gamepad Mapping:
      // Buttons: 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 6=LT, 7=RT, 8=Select, 9=Start, 12=D-Up, 13=D-Down, 14=D-Left, 15=D-Right
      // Axes: 0=LeftStick X, 1=LeftStick Y, 2=RightStick X, 3=RightStick Y
      const btn = (idx: number): boolean => {
        const b = gp!.buttons[idx];
        return typeof b === 'object' ? b.pressed || b.value > 0.3 : b > 0.3;
      };

      const stickX = gp.axes[0] || 0;
      const stickY = gp.axes[1] || 0;

      // Steering (Left Stick X or D-Pad Left/Right)
      if (stickX < -this.deadzone || btn(14)) left = true;
      if (stickX > this.deadzone || btn(15)) right = true;

      // Thrust (Left Stick Up, D-Pad Up, Right Trigger [RT / btn 7], or Button A [btn 0])
      if (stickY < -this.deadzone || btn(12) || btn(7) || btn(0)) up = true;

      // Primary Fire (Button X [btn 2], Right Bumper [RB / btn 5], or Right Stick click)
      if (btn(2) || btn(5)) fire = true;

      // Secondary Fire / Powerup Shot (Button B [btn 1] or Left Bumper [LB / btn 4])
      if (btn(1) || btn(4)) secondaryFire = true;

      // Special Ability (Button Y [btn 3] or Left Trigger [LT / btn 6])
      if (btn(3) || btn(6)) tertiaryFire = true;
    }

    // 3. Mobile Touch Controls
    up = up || this.touchState.up;
    left = left || this.touchState.left;
    right = right || this.touchState.right;
    fire = fire || this.touchState.fire;
    secondaryFire = secondaryFire || this.touchState.secondaryFire;
    tertiaryFire = tertiaryFire || this.touchState.tertiaryFire;

    return {
      up,
      left,
      right,
      fire,
      secondaryFire,
      tertiaryFire,
    };
  }

  public touchState: InputState = {
    up: false,
    left: false,
    right: false,
    fire: false,
    secondaryFire: false,
    tertiaryFire: false,
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
    };

    const endHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.setTouchAction(action, false);
      el.classList.remove('touch-active');
    };

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

      if (dist < 12) {
        this.touchState.left = false;
        this.touchState.right = false;
        this.touchState.up = false;
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
      this.touchState.up = dist > 22;
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
