export interface ShipConfig {
  id: number;
  name: string;
  subtitle: string;
  description: string[];
  offsetY: number;
  scaleSmall: number;
  scaleLarge: number;
  rotateSpeed: number; // degrees per tick or radians
  maxThrust: number;
  accel: number;
  hitPoints: number;
  startGunLevel: number;
  startThrustLevel: number;
  hasTrackingCannon: boolean;
  trackingFireRate: number;
  specialType: number; // 0=None, 1=Turtle Cannon, 2=ShapeShifter, 3=HeatSeeker, 4=PowerupAttractor
  subLevel: number;
  unlockedByDefault: boolean;
  unlockRequirement: string;
}

export const SHIP_CONFIGS: ShipConfig[] = [
  {
    id: 0,
    name: 'The Tank',
    subtitle: 'Heavy Assault Cruiser',
    description: [
      'Heavy assault fighter with boosted starting armor and dual-pulse cannons.',
      'Meant to slug it out in heavy crossfire, trading speed for destructive power.',
    ],
    offsetY: 3.0,
    scaleSmall: 1.0,
    scaleLarge: 3.0,
    rotateSpeed: 5.0,
    maxThrust: 6.0,
    accel: 0.1,
    hitPoints: 280.0,
    startGunLevel: 2,
    startThrustLevel: 0,
    hasTrackingCannon: false,
    trackingFireRate: 0,
    specialType: 0,
    subLevel: 10,
    unlockedByDefault: true,
    unlockRequirement: 'UNLOCKED',
  },
  {
    id: 1,
    name: 'The Wing',
    subtitle: 'Balanced Interceptor',
    description: [
      'The Wing is a balanced mix of speed & armor.',
      'The Wing is specially designed to be a smaller target for the numerous',
      'enemies you are to face.',
      'Offers a great compromise for those starting off in the New Grounds.',
    ],
    offsetY: 4.0,
    scaleSmall: 1.0,
    scaleLarge: 3.0,
    rotateSpeed: 7.0,
    maxThrust: 7.0,
    accel: 0.25,
    hitPoints: 240.0,
    startGunLevel: 1,
    startThrustLevel: 1,
    hasTrackingCannon: false,
    trackingFireRate: 0,
    specialType: 0,
    subLevel: 10,
    unlockedByDefault: true,
    unlockRequirement: 'UNLOCKED',
  },
  {
    id: 2,
    name: 'The Squid',
    subtitle: 'High-Speed Recon Skiff',
    description: [
      'The Squid is a light ship designed for quick item acquisition on the field.',
      'The thrusters have been maxed out and the speed & accel borders on reckless.',
      'Light armor is balanced with an increase in evasion abilities.',
      'Only those of fast reflexes need apply.',
    ],
    offsetY: 0.0,
    scaleSmall: 1.0,
    scaleLarge: 3.0,
    rotateSpeed: 10.0,
    maxThrust: 10.0,
    accel: 0.48,
    hitPoints: 200.0,
    startGunLevel: 0,
    startThrustLevel: 3,
    hasTrackingCannon: false,
    trackingFireRate: 0,
    specialType: 0,
    subLevel: 10,
    unlockedByDefault: true,
    unlockRequirement: 'UNLOCKED',
  },
  {
    id: 3,
    name: 'The Rabbit',
    subtitle: 'Hit & Run Corvette',
    description: [
      'The Rabbit is a light ship designed for hit and run engagements.',
      'Sacrifices armor for a special automated tracking cannon typical',
      'of corvettes and larger capital ships.',
      'Upgrade weapon systems to maximize effectiveness.',
    ],
    offsetY: -2.0,
    scaleSmall: 1.0,
    scaleLarge: 3.0,
    rotateSpeed: 12.0,
    maxThrust: 11.0,
    accel: 0.35,
    hitPoints: 180.0,
    startGunLevel: 0,
    startThrustLevel: 2,
    hasTrackingCannon: true,
    trackingFireRate: 12,
    specialType: 0,
    subLevel: 12,
    unlockedByDefault: false,
    unlockRequirement: 'WIN 1 MATCH',
  },
  {
    id: 4,
    name: 'The Turtle',
    subtitle: 'Heavy Siege Defender',
    description: [
      'Max armor plating and heavy hull mass.',
      'Fires a massive piercing kinetic shell that obliterates targets in its path.',
      'Activate with [SPECIAL] / [R] / [Y].',
    ],
    offsetY: 0.0,
    scaleSmall: 1.0,
    scaleLarge: 3.0,
    rotateSpeed: 4.5,
    maxThrust: 5.2,
    accel: 0.15,
    hitPoints: 250.0,
    startGunLevel: 1,
    startThrustLevel: 1,
    hasTrackingCannon: false,
    trackingFireRate: 0,
    specialType: 1, // Turtle Cannon
    subLevel: 12,
    unlockedByDefault: false,
    unlockRequirement: 'WIN 2 MATCHES',
  },
  {
    id: 5,
    name: 'The Flash',
    subtitle: 'Experimental Morph Hybrid',
    description: [
      'High-acceleration interceptor with twitch agility.',
      'Morphs between high-speed skiff and heavy-armor assault configurations.',
      'Transform with [SPECIAL] / [R] / [Y].',
    ],
    offsetY: 0.0,
    scaleSmall: 1.0,
    scaleLarge: 3.0,
    rotateSpeed: 1.0,
    maxThrust: 1.0,
    accel: 0.1,
    hitPoints: 190.0,
    startGunLevel: 3,
    startThrustLevel: 3,
    hasTrackingCannon: false,
    trackingFireRate: 0,
    specialType: 2, // ShapeShifter
    subLevel: 14,
    unlockedByDefault: false,
    unlockRequirement: 'WIN 3 MATCHES',
  },
  {
    id: 6,
    name: 'The Hunter',
    subtitle: 'Missile Corvette',
    description: [
      'Fast strike craft with balanced handling.',
      'Launches a 3-missile tracking salvo to overwhelm evasive targets.',
      'Launch missiles with [SPECIAL] / [R] / [Y].',
    ],
    offsetY: 0.0,
    scaleSmall: 1.0,
    scaleLarge: 3.0,
    rotateSpeed: 4.8,
    maxThrust: 7.0,
    accel: 0.3,
    hitPoints: 220.0,
    startGunLevel: 0,
    startThrustLevel: 1,
    hasTrackingCannon: false,
    trackingFireRate: 0,
    specialType: 3, // HeatSeeker
    subLevel: 12,
    unlockedByDefault: false,
    unlockRequirement: 'WIN 4 MATCHES',
  },
  {
    id: 7,
    name: 'The Flagship',
    subtitle: 'Command Dreadnought',
    description: [
      'Command dreadnought with heavy defensive bulk.',
      'Generates a gravity pulse that pulls or repels nearby objects and hazards.',
      'Toggle A/R unit with [SPECIAL] / [R] / [Y].',
    ],
    offsetY: 0.0,
    scaleSmall: 0.5,
    scaleLarge: 1.5,
    rotateSpeed: 2.0,
    maxThrust: 3.9,
    accel: 0.11,
    hitPoints: 300.0,
    startGunLevel: 0,
    startThrustLevel: 2,
    hasTrackingCannon: true,
    trackingFireRate: 14,
    specialType: 4, // Attractor/Repulser
    subLevel: 14,
    unlockedByDefault: false,
    unlockRequirement: 'WIN 5 MATCHES',
  },
];

// Raw polygon points for all 8 ships [x, y, isCollisionFlag]
export const RAW_SHIP_POINTS: [number, number, number][][] = [
  // 0: Tank
  [
    [-3, -14, 0],
    [-3, -18, 1],
    [-5, -15, 0],
    [-7, -3, 0],
    [-19, -6, 1],
    [-16, 1, 1],
    [-9, 5, 0],
    [-6, 8, 1],
  ],
  // 1: Wing
  [
    [0, -18, 1],
    [-4, -4, 0],
    [-12, 5, 1],
    [-5, 5, 0],
    [-3, 9, 1],
  ],
  // 2: Squid
  [
    [-3, -16, 1],
    [-6, 14, 0],
    [-10, -7, 1],
    [-12, -2, 1],
    [-12, 2, 1],
    [-5, 19, 1],
    [-8, 2, 0],
    [-3, 2, 0],
    [0, 22, 1],
  ],
  // 3: Rabbit
  [
    [-3, -12, 1],
    [-6, -3, 1],
    [-6, 3, 1],
    [-10, 5, 0],
    [-10, 20, 0],
    [-3, 20, 0],
    [-3, 5, 0],
    [-10, 5, 0],
    [-6, 10, 1],
  ],
  // 4: Turtle
  [
    [0, -18, 1],
    [-4, -15, 1],
    [-4, -12, 0],
    [-7, -9, 0],
    [-13, -10, 1],
    [-10, -6, 1],
    [-10, 7, 1],
    [-13, 13, 1],
    [-7, 10, 1],
    [0, 15, 1],
  ],
  // 5: Flash
  [
    [0, -15, 0],
    [-15, 11, 0],
    [-5, 5, 0],
    [-10, 11, 0],
    [0, 7, 0],
  ],
  // 6: Hunter
  [
    [0, -18, 1],
    [-7, 9, 0],
    [-13, 10, 1],
    [-10, 6, 0],
    [-4, 15, 0],
    [-4, 12, 0],
    [0, 18, 1],
  ],
  // 7: Flagship
  [
    [0, -37, 0],
    [-15, -37, 1],
    [-15, -24, 0],
    [-8, -24, 0],
    [-8, -15, 0],
    [-22, -15, 0],
    [-22, -19, 0],
    [-29, -19, 1],
    [-29, 19, 1],
    [-22, 19, 0],
    [-22, 12, 0],
    [0, 12, 0],
  ],
];

// Color definitions for player slots 0..7
export interface ColorProfile {
  name: string;
  primary: string;
  glow: string;
  core: string;
  shades: string[];
}

export const PLAYER_COLORS: ColorProfile[] = [
  {
    name: 'Neon Cyan',
    primary: '#00ffcc',
    glow: 'rgba(0, 255, 204, 0.6)',
    core: '#e0ffff',
    shades: ['#00ffcc', '#00e6b8', '#00cca3', '#00b38f', '#00997a', '#008066'],
  },
  {
    name: 'Electric Amber',
    primary: '#ffaa00',
    glow: 'rgba(255, 170, 0, 0.6)',
    core: '#fff8e6',
    shades: ['#ffaa00', '#e69900', '#cc8800', '#b37700', '#996600', '#805500'],
  },
  {
    name: 'Plasma Violet',
    primary: '#df70ff',
    glow: 'rgba(223, 112, 255, 0.65)',
    core: '#ffffff',
    shades: ['#df70ff', '#cb5cee', '#b848dc', '#a434cb', '#9120b9', '#7e0ca8'],
  },
  {
    name: 'Laser Crimson',
    primary: '#ff3344',
    glow: 'rgba(255, 51, 68, 0.6)',
    core: '#ffe6e8',
    shades: ['#ff3344', '#e62e3d', '#cc2936', '#b32430', '#991f29', '#801a22'],
  },
  {
    name: 'Hyper Emerald',
    primary: '#33ff33',
    glow: 'rgba(51, 255, 51, 0.6)',
    core: '#e6ffe6',
    shades: ['#33ff33', '#2ee62e', '#29cc29', '#24b324', '#1f991f', '#1a801a'],
  },
  {
    name: 'Solar Yellow',
    primary: '#ffee00',
    glow: 'rgba(255, 238, 0, 0.6)',
    core: '#ffffea',
    shades: ['#ffee00', '#e6d600', '#ccbe00', '#b3a700', '#998e00', '#807700'],
  },
  {
    name: 'Sky Azure',
    primary: '#3399ff',
    glow: 'rgba(51, 153, 255, 0.6)',
    core: '#e6f2ff',
    shades: ['#3399ff', '#2e8ae6', '#297acc', '#246bb3', '#1f5c99', '#1a4c80'],
  },
  {
    name: 'Hot Pink',
    primary: '#ff33aa',
    glow: 'rgba(255, 51, 170, 0.6)',
    core: '#ffe6f5',
    shades: ['#ff33aa', '#e62e99', '#cc2988', '#b32477', '#991f66', '#801a55'],
  },
];

export const TEAM_COLORS = {
  BETA: {
    name: 'Beta Squadron',
    primary: '#3399ff',
    glow: 'rgba(51, 153, 255, 0.6)',
    bg: '#001a33',
  },
  GAMMA: {
    name: 'Gamma Fleet',
    primary: '#ff3344',
    glow: 'rgba(255, 51, 68, 0.6)',
    bg: '#330006',
  },
};

export const POWERUP_NAMES: string[] = [
  'GUN UPGRADE',
  'THRUST UPGRADE',
  'RETROS',
  'INVULNERABILITY',
  'ZAP ATTACK',
  'EXTRA HEALTH',
  'HEAT SEEKER',
  'WORMHOLE TURRET',
  'WORMHOLE MINES',
  'SEND UFO',
  'SEND INFLATER',
  'SEND MINELAYER',
  'SEND GUNSHIP',
  'SEND SCARAB',
  'SEND NUKE',
  'SEND WALLCRAWLER',
  'WORMHOLE BEAM',
  'WORMHOLE EMP',
  'SEND GHOST-PUD',
  'SEND ARTILLERY',
];

export const GAME_CONSTANTS = {
  // Base dimensions
  BASE_VIEWPORT_WIDTH: 655,
  BASE_VIEWPORT_HEIGHT: 655,
  STATUS_WIDTH: 430,
  STATUS_HEIGHT: 49,
  SIDEBAR_WIDTH: 144,
  MAX_POWERUPS: 5,
  TICK_RATE: 60,
  PHYSICS_STEP: 1 / 60,
  DECEL_RETROS: 0.989,

  // Table sizing matching WormholeModel.java
  SIZES: {
    SMALL: {
      key: 'SMALL',
      name: 'Small (2-Player)',
      opponents: 1,
      maxPlayers: 2,
      orbitDistance: 180,
      boardWidth: 1050,
      boardHeight: 1050,
    },
    MEDIUM: {
      key: 'MEDIUM',
      name: 'Medium (4-Player)',
      opponents: 3,
      maxPlayers: 4,
      orbitDistance: 240,
      boardWidth: 1310,
      boardHeight: 1310,
    },
    LARGE: {
      key: 'LARGE',
      name: 'Large (6-Player)',
      opponents: 5,
      maxPlayers: 6,
      orbitDistance: 260,
      boardWidth: 1450,
      boardHeight: 1450,
    },
    HUGE: {
      key: 'HUGE',
      name: 'Huge (8-Player)',
      opponents: 7,
      maxPlayers: 8,
      orbitDistance: 280,
      boardWidth: 1572,
      boardHeight: 1572,
    },
    SOLO_OPPONENT: {
      key: 'SMALL',
      name: 'Small (2-Player)',
      opponents: 1,
      maxPlayers: 2,
      orbitDistance: 180,
      boardWidth: 1050,
      boardHeight: 1050,
    },
    STANDARD: {
      key: 'MEDIUM',
      name: 'Medium (4-Player)',
      opponents: 3,
      maxPlayers: 4,
      orbitDistance: 240,
      boardWidth: 1310,
      boardHeight: 1310,
    },
  },
};
