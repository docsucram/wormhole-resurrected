export type MatchPhase =
  | 'TITLE'
  | 'HANGAR'
  | 'STANDBY'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'ROUND_OVER'
  | 'MATCH_OVER'
  | 'PAUSED';

export interface MatchStats {
  p1Kills: number;
  p1Deaths: number;
  p1HazardsSent: number;
  p1HazardsCleared: number;
  p1PowerupsCollected: number;
  p2Kills: number;
  p2Deaths: number;
  p2HazardsSent: number;
  matchDuration: number;
}

export class GameStateManager {
  public phase: MatchPhase = 'PLAYING';
  public player1Score = 0;
  public player2Score = 0;
  public targetWins = 5;
  public currentRound = 1;

  public countdownTimer = 2.4;
  public roundOverTimer = 0;
  public winner: 'PLAYER 1' | 'PLAYER 2' | null = null;
  public roundWinner: 'PLAYER 1' | 'PLAYER 2' | null = null;

  public stats: MatchStats = {
    p1Kills: 0,
    p1Deaths: 0,
    p1HazardsSent: 0,
    p1HazardsCleared: 0,
    p1PowerupsCollected: 0,
    p2Kills: 0,
    p2Deaths: 0,
    p2HazardsSent: 0,
    matchDuration: 0,
  };

  // Event callbacks
  public onPhaseChange?: (phase: MatchPhase) => void;
  public onScoreUpdate?: (p1Score: number, p2Score: number) => void;
  public onRoundStart?: () => void;
  public onRoundEnd?: (winner: 'PLAYER 1' | 'PLAYER 2', p1Score: number, p2Score: number) => void;
  public onMatchEnd?: (winner: string, stats: MatchStats) => void;

  constructor(targetWins = 5) {
    this.targetWins = targetWins;
  }

  public startMatch(targetWins?: number, withCountdown = true): void {
    if (targetWins) this.targetWins = targetWins;
    this.player1Score = 0;
    this.player2Score = 0;
    this.currentRound = 1;
    this.winner = null;
    this.roundWinner = null;

    this.stats = {
      p1Kills: 0,
      p1Deaths: 0,
      p1HazardsSent: 0,
      p1HazardsCleared: 0,
      p1PowerupsCollected: 0,
      p2Kills: 0,
      p2Deaths: 0,
      p2HazardsSent: 0,
      matchDuration: 0,
    };

    if (this.onRoundStart) this.onRoundStart();
    if (withCountdown) {
      this.startCountdown();
    } else {
      this.phase = 'STANDBY';
      if (this.onPhaseChange) this.onPhaseChange('STANDBY');
    }
  }

  public startCountdown(): void {
    this.phase = 'COUNTDOWN';
    this.countdownTimer = 2.4;
    if (this.onPhaseChange) this.onPhaseChange('COUNTDOWN');
  }

  public nextRound(): void {
    if (this.phase === 'MATCH_OVER' || this.player1Score >= this.targetWins || this.player2Score >= this.targetWins) {
      return;
    }
    this.currentRound++;
    this.roundWinner = null;
    if (this.onRoundStart) this.onRoundStart();
    this.startCountdown();
  }

  public registerPlayer1Kill(): void {
    this.player1Score++;
    this.stats.p1Kills++;
    this.stats.p2Deaths++;
    this.roundWinner = 'PLAYER 1';
    if (this.onScoreUpdate) this.onScoreUpdate(this.player1Score, this.player2Score);

    if (this.player1Score >= this.targetWins) {
      this.finishMatch('PLAYER 1');
    } else {
      this.phase = 'ROUND_OVER';
      if (this.onRoundEnd) this.onRoundEnd('PLAYER 1', this.player1Score, this.player2Score);
      if (this.onPhaseChange) this.onPhaseChange('ROUND_OVER');
    }
  }

  public registerPlayer2Kill(): void {
    this.player2Score++;
    this.stats.p2Kills++;
    this.stats.p1Deaths++;
    this.roundWinner = 'PLAYER 2';
    if (this.onScoreUpdate) this.onScoreUpdate(this.player1Score, this.player2Score);

    if (this.player2Score >= this.targetWins) {
      this.finishMatch('PLAYER 2');
    } else {
      this.phase = 'ROUND_OVER';
      if (this.onRoundEnd) this.onRoundEnd('PLAYER 2', this.player1Score, this.player2Score);
      if (this.onPhaseChange) this.onPhaseChange('ROUND_OVER');
    }
  }

  public finishMatchManually(winner: 'PLAYER 1' | 'PLAYER 2'): void {
    this.finishMatch(winner);
  }

  private finishMatch(winner: 'PLAYER 1' | 'PLAYER 2'): void {
    this.phase = 'MATCH_OVER';
    this.winner = winner;
    if (this.onPhaseChange) this.onPhaseChange('MATCH_OVER');
    if (this.onMatchEnd) this.onMatchEnd(winner, this.stats);
  }

  public update(dt: number): void {
    if (this.phase === 'PLAYING') {
      this.stats.matchDuration += dt;
    } else if (this.phase === 'COUNTDOWN') {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.phase = 'PLAYING';
        if (this.onPhaseChange) this.onPhaseChange('PLAYING');
      }
    } else if (this.phase === 'ROUND_OVER') {
      // Modal stays active until player presses [SPACE] or clicks NEXT ROUND
    }
  }
}
