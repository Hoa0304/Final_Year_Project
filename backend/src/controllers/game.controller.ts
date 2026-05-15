/**
 * Game Controller
 * 
 * Handles game-related API endpoints
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  canUserPlayGame,
  recordGamePlay,
  checkTicTacToeWinner,
  makeAIMove,
  GameResult
} from '../services/game.service';

/**
 * Get all available games (both from games table and game_instances table)
 */
export async function getGames(req: Request, res: Response) {
  try {
    // Get games from games table (legacy games)
    const { data: legacyGames, error: legacyError } = await supabase
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (legacyError) {
      console.error('Get legacy games error:', legacyError);
    }
    
    // Get game instances (custom games created by admin)
    const { data: gameInstances, error: instancesError } = await supabase
      .from('game_instances')
      .select(`
        id,
        name,
        description,
        reward_amount,
        max_plays_per_day,
        is_active,
        created_at,
        game_templates (
          type
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (instancesError) {
      console.error('Get game instances error:', instancesError);
    }
    
    // Combine both: convert game instances to game format
    const allGames = [
      ...(legacyGames || []),
      ...(gameInstances || []).map((instance: any) => ({
        id: instance.id,
        name: instance.name,
        description: instance.description,
        reward_amount: instance.reward_amount,
        max_plays_per_day: instance.max_plays_per_day,
        is_active: instance.is_active,
        created_at: instance.created_at,
        game_type: instance.game_templates?.type || 'unknown', // Add game type for routing
        is_instance: true, // Flag to identify game instances
      })),
    ];
    
    res.json({ games: allGames });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get game by ID (check both games table and game_instances table)
 */
export async function getGameById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // First check game_instances (custom games)
    const { data: instance, error: instanceError } = await supabase
      .from('game_instances')
      .select(`
        *,
        game_templates (
          id,
          name,
          type,
          description
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (instance && !instanceError) {
      // Get game content if it's a game instance
      const { data: content } = await supabase
        .from('game_content')
        .select('*')
        .eq('game_instance_id', id)
        .order('order_index', { ascending: true });
      
      return res.json({
        game: {
          ...instance,
          content: content || [],
          game_type: instance.game_templates?.type || 'unknown',
          is_instance: true,
        },
      });
    }
    
    // Fallback to games table (legacy games)
    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error || !game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({ game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user's game statistics
 */
export async function getUserGameStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    
    // Get total plays, wins, and earnings
    const { data: plays, error } = await supabase
      .from('user_game_plays')
      .select('result, reward_earned, game_id, games(name)')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Get user game stats error:', error);
      return res.status(500).json({ error: 'Failed to fetch game stats' });
    }
    
    const stats = {
      totalPlays: plays?.length || 0,
      wins: plays?.filter(p => p.result === 'win').length || 0,
      losses: plays?.filter(p => p.result === 'loss').length || 0,
      draws: plays?.filter(p => p.result === 'draw').length || 0,
      totalEarnings: plays?.reduce((sum, p) => sum + parseFloat(p.reward_earned?.toString() || '0'), 0) || 0,
      playsByGame: plays?.reduce((acc: any, p: any) => {
        const gameName = p.games?.name || 'Unknown';
        if (!acc[gameName]) {
          acc[gameName] = { plays: 0, wins: 0, earnings: 0 };
        }
        acc[gameName].plays++;
        if (p.result === 'win') acc[gameName].wins++;
        acc[gameName].earnings += parseFloat(p.reward_earned?.toString() || '0');
        return acc;
      }, {}) || {}
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('Get user game stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check if user can play a game
 */
export async function checkCanPlay(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { gameId } = req.params;
    
    const checkResult = await canUserPlayGame(userId, gameId);
    
    res.json(checkResult);
  } catch (error) {
    console.error('Check can play error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Play TicTacToe game
 * 
 * Request body:
 * - board: 3x3 array representing the game board
 * - playerMove: { row: number, col: number } - player's move
 */
export async function playTicTacToe(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { gameId, board, playerMove } = req.body;
    
    if (!gameId || !board || !playerMove) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate game ID (should be TicTacToe game)
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, name')
      .eq('id', gameId)
      .eq('name', 'TicTacToe')
      .single();
    
    if (gameError || !game) {
      return res.status(404).json({ error: 'TicTacToe game not found' });
    }
    
    // Check if user can play
    const canPlay = await canUserPlayGame(userId, gameId);
    if (!canPlay.canPlay) {
      return res.status(400).json({ error: canPlay.message || 'Cannot play game' });
    }
    
    // Validate board (3x3)
    if (!Array.isArray(board) || board.length !== 3) {
      return res.status(400).json({ error: 'Invalid board format' });
    }
    
    // Make player move
    const { row, col } = playerMove;
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return res.status(400).json({ error: 'Invalid move position' });
    }
    
    if (board[row][col]) {
      return res.status(400).json({ error: 'Cell already occupied' });
    }
    
    // Create a copy of the board
    const newBoard = board.map((r: string[]) => [...r]);
    newBoard[row][col] = 'X';
    
    // Check if player won
    const winner = checkTicTacToeWinner(newBoard);
    if (winner === 'X') {
      const result = await recordGamePlay(userId, gameId, {
        result: 'win',
        reward: 0, // Will be calculated by service
        gameData: { board: newBoard, winner: 'X' }
      });
      
      return res.json({
        ...result,
        board: newBoard,
        winner: 'X',
        gameOver: true
      });
    }
    
    if (winner === 'draw') {
      const result = await recordGamePlay(userId, gameId, {
        result: 'draw',
        reward: 0,
        gameData: { board: newBoard, winner: 'draw' }
      });
      
      return res.json({
        ...result,
        board: newBoard,
        winner: 'draw',
        gameOver: true
      });
    }
    
    // Make AI move
    const aiMove = makeAIMove(newBoard);
    if (!aiMove) {
      // Board is full (shouldn't happen, but handle it)
      const result = await recordGamePlay(userId, gameId, {
        result: 'draw',
        reward: 0,
        gameData: { board: newBoard, winner: 'draw' }
      });
      
      return res.json({
        ...result,
        board: newBoard,
        winner: 'draw',
        gameOver: true
      });
    }
    
    newBoard[aiMove.row][aiMove.col] = 'O';
    
    // Check if AI won or draw
    const finalWinner = checkTicTacToeWinner(newBoard);
    if (finalWinner === 'O') {
      const result = await recordGamePlay(userId, gameId, {
        result: 'loss',
        reward: 0,
        gameData: { board: newBoard, winner: 'O' }
      });
      
      return res.json({
        ...result,
        board: newBoard,
        aiMove,
        winner: 'O',
        gameOver: true
      });
    }
    
    if (finalWinner === 'draw') {
      const result = await recordGamePlay(userId, gameId, {
        result: 'draw',
        reward: 0,
        gameData: { board: newBoard, winner: 'draw' }
      });
      
      return res.json({
        ...result,
        board: newBoard,
        aiMove,
        winner: 'draw',
        gameOver: true
      });
    }
    
    // Game continues
    res.json({
      success: true,
      board: newBoard,
      aiMove,
      winner: null,
      gameOver: false
    });
  } catch (error) {
    console.error('Play TicTacToe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit game result (for other games)
 */
export async function submitGameResult(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { gameId, result, gameData } = req.body;
    
    if (!gameId || !result) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['win', 'loss', 'draw'].includes(result)) {
      return res.status(400).json({ error: 'Invalid result' });
    }
    
    // Check if user can play
    const canPlay = await canUserPlayGame(userId, gameId);
    if (!canPlay.canPlay) {
      return res.status(400).json({ error: canPlay.message || 'Cannot play game' });
    }
    
    const gameResult: GameResult = {
      result: result as 'win' | 'loss' | 'draw',
      reward: 0, // Will be calculated by service
      gameData
    };
    
    const recordResult = await recordGamePlay(userId, gameId, gameResult);
    
    res.json(recordResult);
  } catch (error) {
    console.error('Submit game result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

