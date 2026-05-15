import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGames, checkCanPlay, type Game } from '../../services/game.service';

export default function GamesScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: games, isLoading, refetch } = useQuery({
    queryKey: ['games'],
    queryFn: getGames,
  });

  // Fetch play counts for each game
  const { data: gamePlayCounts } = useQuery({
    queryKey: ['gamePlayCounts', games?.map(g => g.id)],
    queryFn: async () => {
      if (!games) return {};
      const counts: { [gameId: string]: { playsToday: number; maxPlays: number } } = {};
      for (const game of games) {
        try {
          const result = await checkCanPlay(game.id);
          counts[game.id] = {
            playsToday: result.playsToday,
            maxPlays: result.maxPlays,
          };
        } catch (error) {
          counts[game.id] = { playsToday: 0, maxPlays: game.max_plays_per_day };
        }
      }
      return counts;
    },
    enabled: !!games && games.length > 0,
  });

  async function handlePlayGame(game: Game) {
    try {
      // Check if user can play
      const canPlay = await checkCanPlay(game.id);
      
      if (!canPlay.canPlay) {
        Alert.alert('Cannot Play', canPlay.message || 'You have reached the daily limit');
        return;
      }

      // Navigate to game screen based on game type or name
      if (game.name === 'TicTacToe') {
        (navigation as any).navigate('TicTacToe', { gameId: game.id });
      } else if (game.game_type === 'quiz' || (game.is_instance && game.game_type === 'quiz')) {
        (navigation as any).navigate('QuizGame', { gameId: game.id });
      } else {
        Alert.alert('Coming Soon', `${game.name} will be available soon!`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to check game availability');
    }
  }

  function renderGame({ item }: { item: Game }) {
    const playCount = gamePlayCounts?.[item.id];
    const playsToday = playCount?.playsToday ?? 0;
    const maxPlays = playCount?.maxPlays ?? item.max_plays_per_day;
    const canPlay = playsToday < maxPlays;

    return (
      <TouchableOpacity
        style={[styles.gameCard, !canPlay && styles.gameCardDisabled]}
        onPress={() => handlePlayGame(item)}
        activeOpacity={0.7}
        disabled={!canPlay}
      >
        <View style={styles.gameHeader}>
          <View style={styles.gameIcon}>
            <Ionicons name="game-controller" size={32} color="#007AFF" />
          </View>
          <View style={styles.gameInfo}>
            <Text style={styles.gameName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.gameDescription}>{item.description}</Text>
            )}
          </View>
        </View>
        <View style={styles.gameFooter}>
          <View style={styles.rewardContainer}>
            <Ionicons name="cash" size={20} color="#FF9500" />
            <Text style={styles.rewardText}>
              {item.reward_amount.toFixed(0)} coins per win
            </Text>
          </View>
          <View style={styles.limitContainer}>
            <Ionicons 
              name={canPlay ? "time-outline" : "lock-closed-outline"} 
              size={16} 
              color={canPlay ? "#666" : "#FF3B30"} 
            />
            <Text style={[styles.limitText, !canPlay && styles.limitTextDisabled]}>
              {playsToday}/{maxPlays} plays today
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Games</Text>
            <Text style={styles.subtitle}>Play games to earn coins!</Text>
          </View>
        </View>
        <FlatList
          data={games || []}
          renderItem={renderGame}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={() => {
            refetch();
            // Refetch play counts when refreshing
            queryClient.invalidateQueries({ queryKey: ['gamePlayCounts'] });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="game-controller-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No games available</Text>
            </View>
          }
        />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    padding: 16,
  },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameCardDisabled: {
    opacity: 0.6,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    color: '#666',
  },
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 6,
  },
  limitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  limitTextDisabled: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});


