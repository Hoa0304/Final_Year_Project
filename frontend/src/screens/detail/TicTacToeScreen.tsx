import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { playTicTacToe, checkCanPlay } from '../../services/game.service';

export default function TicTacToeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { gameId } = route.params as { gameId: string };

  const [board, setBoard] = useState<string[][]>([
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'X' | 'O' | 'draw' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canPlay, setCanPlay] = useState(true);

  useEffect(() => {
    checkCanPlayStatus();
  }, []);

  async function checkCanPlayStatus() {
    try {
      const result = await checkCanPlay(gameId);
      setCanPlay(result.canPlay);
      if (!result.canPlay) {
        Alert.alert('Cannot Play', result.message || 'You have reached the daily limit', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error checking can play:', error);
    }
  }

  const playMutation = useMutation({
    mutationFn: playTicTacToe,
    onSuccess: (data) => {
      setIsLoading(false);
      setBoard(data.board);
      setWinner(data.winner);
      setGameOver(data.gameOver);

      if (data.gameOver) {
        if (data.winner === 'X') {
          Alert.alert('🎉 You Won!', data.message || `You earned ${data.reward || 0} coins!`, [
            {
              text: 'Play Again',
              onPress: () => resetGame(),
            },
            {
              text: 'Back',
              onPress: () => {
                queryClient.invalidateQueries({ queryKey: ['balance'] });
                queryClient.invalidateQueries({ queryKey: ['games'] });
                queryClient.invalidateQueries({ queryKey: ['gamePlayCounts'] });
                navigation.goBack();
              },
            },
          ]);
        } else if (data.winner === 'O') {
          Alert.alert('😔 You Lost', data.message || 'Better luck next time!', [
            {
              text: 'Try Again',
              onPress: () => resetGame(),
            },
            {
              text: 'Back',
              onPress: () => {
                queryClient.invalidateQueries({ queryKey: ['gamePlayCounts'] });
                navigation.goBack();
              },
            },
          ]);
        } else {
          Alert.alert('🤝 Draw', data.message || "It's a tie!", [
            {
              text: 'Play Again',
              onPress: () => resetGame(),
            },
            {
              text: 'Back',
              onPress: () => {
                queryClient.invalidateQueries({ queryKey: ['gamePlayCounts'] });
                navigation.goBack();
              },
            },
          ]);
        }
      }
    },
    onError: (error: any) => {
      setIsLoading(false);
      Alert.alert('Error', error.response?.data?.error || 'Failed to make move');
    },
  });

  function handleCellPress(row: number, col: number) {
    if (board[row][col] || gameOver || isLoading || !canPlay) {
      return;
    }

    setIsLoading(true);
    playMutation.mutate({
      gameId,
      board,
      playerMove: { row, col },
    });
  }

  function resetGame() {
    setBoard([
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ]);
    setGameOver(false);
    setWinner(null);
    checkCanPlayStatus();
    // Refresh play counts after reset
    queryClient.invalidateQueries({ queryKey: ['gamePlayCounts'] });
  }

  function renderCell(row: number, col: number) {
    const value = board[row][col];
    const isWinning = false; // Could highlight winning cells

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[styles.cell, isWinning && styles.winningCell]}
        onPress={() => handleCellPress(row, col)}
        disabled={!!value || gameOver || isLoading}
      >
        <Text style={[styles.cellText, value === 'O' && styles.cellTextO]}>
          {value}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tic-Tac-Toe</Text>
        <Text style={styles.subtitle}>You are X, AI is O</Text>
      </View>

      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((_, colIndex) => renderCell(rowIndex, colIndex))}
          </View>
        ))}
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {gameOver && winner && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>
            {winner === 'X' && '🎉 You Won!'}
            {winner === 'O' && '😔 You Lost'}
            {winner === 'draw' && "🤝 It's a Draw"}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetGame}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.resetButtonText}>New Game</Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  board: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cell: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  winningCell: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  cellText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cellTextO: {
    color: '#FF3B30',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  actions: {
    marginTop: 30,
    alignItems: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
});


