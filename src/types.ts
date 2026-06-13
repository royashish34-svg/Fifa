export interface Team {
  id: string;
  name: string;
  flag: string;
  confederation: string;
  fifaRank: number;
  attackRating: number;
  defenseRating: number;
  wcTitles: number;
  lastWCResult: string;
  starPlayer: string;
  formScore: number;
}

export interface Group {
  id: string; // "A" - "L"
  name: string; // "Group A"
  teams: Team[];
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  scoreA?: number;
  scoreB?: number;
  winner?: string; // team A id, team B id, or "draw" (only in group stage)
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';
}

export interface GroupStanding {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface PredictionResult {
  teamA: Team;
  teamB: Team;
  probA: number;
  probDraw: number;
  probB: number;
  scoreA: number;
  scoreB: number;
  factors: string[];
  verdict: string;
}
