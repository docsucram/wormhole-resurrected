export interface LogEntry {
  id: number;
  text: string;
  color: string;
  time: number;
}

export class CombatLog {
  private entries: LogEntry[] = [];
  private nextId = 1;
  private container: HTMLElement | null = null;
  private maxEntries = 5;

  constructor() {
    this.container = document.getElementById('combat-log-feed');
  }

  public add(text: string, color = '#00ffcc'): void {
    const entry: LogEntry = {
      id: this.nextId++,
      text,
      color,
      time: Date.now(),
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    this.render();
  }

  public clear(): void {
    this.entries = [];
    this.render();
  }

  private render(): void {
    if (!this.container) {
      this.container = document.getElementById('combat-log-feed');
      if (!this.container) return;
    }

    this.container.innerHTML = '';
    for (const entry of this.entries) {
      const el = document.createElement('div');
      el.className = 'combat-log-item';
      el.style.color = entry.color;
      el.innerText = `> ${entry.text}`;
      this.container.appendChild(el);
    }
  }
}
