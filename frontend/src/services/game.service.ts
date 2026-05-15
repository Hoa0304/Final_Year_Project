import api from '../config/api';

export interface Game {
  id: string;
  name: string;
  description?: string;
  reward_amount: number;
  max_plays_per_day: number;
  is_active: boolean;
  created_at: string;
  game_type?: string; // 'quiz', 'memory_match', etc.
  is_instance?: boolean; // true if from game_instances table
  content?: any[]; // Game content (for game instances)
  config?: any; // Game configuration (for game instances)
}

export interface GamesResponse {
  games: Game[];
}

export interface GameStats {
  totalPlays: number;
  wins: number;
  losses: number;
  draws: number;
  totalEarnings: number;
  playsByGame: { [gameName: string]: { plays: number; wins: number; earnings: number } };
}

export interface GameStatsResponse {
  stats: GameStats;
}

export interface CanPlayResponse {
  canPlay: boolean;
  playsToday: number;
  maxPlays: number;
  message?: string;
}

export interface TicTacToePlayResponse {
  success: boolean;
  board: string[][];
  aiMove?: { row: number; col: number };
  winner: 'X' | 'O' | 'draw' | null;
  gameOver: boolean;
  reward?: number;
  message?: string;
}

/**
 * Get all available games
 */
export async function getGames(): Promise<Game[]> {
  const response = await api.get<GamesResponse>('/games');
  return response.data.games;
}

/**
 * Get game by ID
 */
export async function getGameById(id: string): Promise<Game> {
  const response = await api.get<{ game: Game }>(`/games/${id}`);
  return response.data.game;
}

/**
 * Get user's game statistics
 */
export async function getUserGameStats(): Promise<GameStats> {
  const response = await api.get<GameStatsResponse>('/games/stats/me');
  return response.data.stats;
}

/**
 * Check if user can play a game
 */
export async function checkCanPlay(gameId: string): Promise<CanPlayResponse> {
  const response = await api.get<CanPlayResponse>(`/games/${gameId}/can-play`);
  return response.data;
}

/**
 * Play TicTacToe game
 * React Query v5 passes the entire mutation variables object as the first parameter
 */
export async function playTicTacToe(variables: {
  gameId: string;
  board: string[][];
  playerMove: { row: number; col: number };
}): Promise<TicTacToePlayResponse> {
  const { gameId, board, playerMove } = variables;
  const response = await api.post<TicTacToePlayResponse>('/games/tictactoe/play', {
    gameId,
    board,
    playerMove
  });
  return response.data;
}

/**
 * Submit game result (for other games)
 */
export async function submitGameResult(variables: {
  gameId: string;
  result: 'win' | 'loss' | 'draw';
  gameData?: any;
}): Promise<{ success: boolean; reward: number; message?: string }> {
  const { gameId, result, gameData } = variables;
  const response = await api.post('/games/submit', {
    gameId,
    result,
    gameData
  });
  return response.data;
}


