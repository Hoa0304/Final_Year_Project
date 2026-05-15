/**
 * Game Service
 * 
 * Handles game logic, validation, and reward distribution
 * Supports multiple mini-games (TicTacToe, Memory Match, etc.)
 */

import { supabase } from '../utils/supabase';
import { createTransaction } from './transaction.service';

export interface GameResult {
  result: 'win' | 'loss' | 'draw';
  reward: number;
  gameData?: any;
}

export interface TicTacToeGameData {
  board: string[][];
  moves: Array<{ row: number; col: number; player: 'X' | 'O' }>;
  winner: 'X' | 'O' | 'draw' | null;
}

/**
 * Check if user can play a game (daily limit check)
 */
export async function canUserPlayGame(userId: string, gameId: string): Promise<{
  canPlay: boolean;
  playsToday: number;
  maxPlays: number;
  message?: string;
}> {
  try {
    // First check game_instances
    let { data: gameInstance, error: instanceError } = await supabase
      .from('game_instances')
      .select('max_plays_per_day, is_active')
      .eq('id', gameId)
      .single();
    
    let game: any = null;
    if (gameInstance && !instanceError) {
      game = gameInstance;
    } else {
      // Fallback to games table
      const { data: legacyGame, error: gameError } = await supabase
        .from('games')
        .select('max_plays_per_day, is_active')
        .eq('id', gameId)
        .single();
      
      if (gameError || !legacyGame) {
        return {
          canPlay: false,
          playsToday: 0,
          maxPlays: 0,
          message: 'Game not found'
        };
      }
      game = legacyGame;
    }
    
    if (!game.is_active) {
      return {
        canPlay: false,
        playsToday: 0,
        maxPlays: game.max_plays_per_day,
        message: 'Game is not active'
      };
    }
    
    // Count plays today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const { count, error: countError } = await supabase
      .from('user_game_plays')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .gte('played_at', todayISO);
    
    if (countError) {
      console.error('Error counting plays:', countError);
      return {
        canPlay: false,
        playsToday: 0,
        maxPlays: game.max_plays_per_day,
        message: 'Error checking play limit'
      };
    }
    
    const playsToday = count || 0;
    const canPlay = playsToday < game.max_plays_per_day;
    
    return {
      canPlay,
      playsToday,
      maxPlays: game.max_plays_per_day,
      message: canPlay 
        ? undefined 
        : `Daily limit reached (${game.max_plays_per_day} plays per day)`
    };
  } catch (error) {
    console.error('Error in canUserPlayGame:', error);
    return {
      canPlay: false,
      playsToday: 0,
      maxPlays: 0,
      message: 'Internal error'
    };
  }
}

/**
 * Record game play and distribute rewards
 */
export async function recordGamePlay(
  userId: string,
  gameId: string,
  gameResult: GameResult
): Promise<{ success: boolean; reward: number; message?: string }> {
  try {
    // First check game_instances
    let { data: gameInstance, error: instanceError } = await supabase
      .from('game_instances')
      .select('reward_amount, name')
      .eq('id', gameId)
      .single();
    
    let game: any = null;
    if (gameInstance && !instanceError) {
      game = gameInstance;
    } else {
      // Fallback to games table
      const { data: legacyGame, error: gameError } = await supabase
        .from('games')
        .select('reward_amount, name')
        .eq('id', gameId)
        .single();
      
      if (gameError || !legacyGame) {
        return {
          success: false,
          reward: 0,
          message: 'Game not found'
        };
      }
      game = legacyGame;
    }
    
    // Calculate reward (only for wins)
    const reward = gameResult.result === 'win' ? game.reward_amount : 0;
    
    // Record game play with explicit played_at timestamp
    const { error: recordError } = await supabase
      .from('user_game_plays')
      .insert({
        user_id: userId,
        game_id: gameId,
        result: gameResult.result,
        reward_earned: reward,
        game_data: gameResult.gameData || null,
        played_at: new Date().toISOString() // Explicitly set played_at to ensure correct timezone
      });
    
    if (recordError) {
      console.error('Error recording game play:', recordError);
      return {
        success: false,
        reward: 0,
        message: 'Failed to record game play'
      };
    }
    
    // Distribute reward if user won
    if (reward > 0) {
      await createTransaction({
        userId,
        type: 'earn',
        amount: reward,
        description: `Won ${game.name} game`,
        referenceType: 'game'
      });
    }
    
    return {
      success: true,
      reward,
      message: gameResult.result === 'win' 
        ? `Congratulations! You earned ${reward} coins!`
        : gameResult.result === 'draw'
        ? 'It\'s a draw! Try again to win coins.'
        : 'Better luck next time!'
    };
  } catch (error) {
    console.error('Error in recordGamePlay:', error);
    return {
      success: false,
      reward: 0,
      message: 'Internal error'
    };
  }
}

/**
 * TicTacToe Game Logic
 * 
 * Checks if there's a winner or draw
 */
export function checkTicTacToeWinner(board: string[][]): 'X' | 'O' | 'draw' | null {
  // Check rows
  for (let row = 0; row < 3; row++) {
    if (board[row][0] && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
      return board[row][0] as 'X' | 'O';
    }
  }
  
  // Check columns
  for (let col = 0; col < 3; col++) {
    if (board[0][col] && board[0][col] === board[1][col] && board[1][col] === board[2][col]) {
      return board[0][col] as 'X' | 'O';
    }
  }
  
  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0] as 'X' | 'O';
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2] as 'X' | 'O';
  }
  
  // Check for draw (board full)
  let isFull = true;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (!board[row][col]) {
        isFull = false;
        break;
      }
    }
    if (!isFull) break;
  }
  
  return isFull ? 'draw' : null;
}

/**
 * Make AI move in TicTacToe (simple strategy)
 */
export function makeAIMove(board: string[][]): { row: number; col: number } | null {
  // Try to win
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (!board[row][col]) {
        board[row][col] = 'O';
        if (checkTicTacToeWinner(board) === 'O') {
          return { row, col };
        }
        board[row][col] = ''; // Undo
      }
    }
  }
  
  // Block player from winning
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (!board[row][col]) {
        board[row][col] = 'X';
        if (checkTicTacToeWinner(board) === 'X') {
          board[row][col] = ''; // Undo
          board[row][col] = 'O'; // Block
          return { row, col };
        }
        board[row][col] = ''; // Undo
      }
    }
  }
  
  // Take center if available
  if (!board[1][1]) {
    return { row: 1, col: 1 };
  }
  
  // Take any available corner
  const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
  for (const [row, col] of corners) {
    if (!board[row][col]) {
      return { row, col };
    }
  }
  
  // Take any available cell
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (!board[row][col]) {
        return { row, col };
      }
    }
  }
  
  return null; // Board is full
}


