import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getGameById, checkCanPlay, submitGameResult } from '../../services/game.service';
import api from '../../config/api';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

export default function QuizGameScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { gameId } = route.params as { gameId: string };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  // Fetch game data - use public endpoint which handles both game instances and legacy games
  const { data: gameData, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      // Use public endpoint which already checks game_instances first, then falls back to games table
      const game = await getGameById(gameId);
      return game;
    },
    enabled: !!gameId,
  });

  // Get questions from content
  const questions: QuizQuestion[] = gameData?.content?.map((content: any) => ({
    id: content.id,
    question: content.content_data?.question || '',
    options: content.content_data?.options || [],
    correctAnswer: content.content_data?.correctAnswer || 0,
    points: content.content_data?.points || 10,
  })) || [];

  const config = gameData?.config || {};
  const timeLimit = config.timeLimit || 60;
  const questionsPerGame = config.questionsPerGame || questions.length;
  const passingScore = config.passingScore || 70;
  const showCorrectAnswer = config.showCorrectAnswer !== false;

  // Timer effect
  useEffect(() => {
    if (!gameStarted || gameFinished || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleFinishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameFinished, timeRemaining]);

  // Check if user can play
  useEffect(() => {
    async function checkCanPlayGame() {
      try {
        const canPlay = await checkCanPlay(gameId);
        if (!canPlay.canPlay) {
          Alert.alert('Cannot Play', canPlay.message || 'You have reached the daily limit', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } catch (error) {
        console.error('Error checking can play:', error);
      }
    }
    checkCanPlayGame();
  }, [gameId]);

  const submitMutation = useMutation({
    mutationFn: submitGameResult,
    onSuccess: (data) => {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      // Invalidate gamePlayCounts with any dependency to ensure it refetches
      queryClient.invalidateQueries({ 
        queryKey: ['gamePlayCounts'],
        exact: false // Match all queries starting with 'gamePlayCounts'
      });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit game result');
    },
  });

  function handleStartGame() {
    if (questions.length === 0) {
      Alert.alert('Error', 'This game has no questions. Please contact admin.');
      return;
    }
    setGameStarted(true);
    setTimeRemaining(timeLimit);
    setAnswers([]);
    setScore(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
  }

  function handleSelectAnswer(answerIndex: number) {
    if (gameFinished) return;
    setSelectedAnswer(answerIndex);
  }

  function handleNextQuestion() {
    if (selectedAnswer === null) {
      Alert.alert('Error', 'Please select an answer');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const newAnswers = [...answers, selectedAnswer];
    const newScore = isCorrect ? score + currentQuestion.points : score;
    
    // Update state immediately
    setAnswers(newAnswers);
    setScore(newScore);

    // Show correct answer if enabled
    if (showCorrectAnswer) {
      setTimeout(() => {
        if (currentQuestionIndex < Math.min(questionsPerGame, questions.length) - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer(null);
        } else {
          // Use the updated values directly instead of relying on state
          handleFinishGameWithData(newAnswers, newScore);
        }
      }, 1500);
    } else {
      if (currentQuestionIndex < Math.min(questionsPerGame, questions.length) - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
      } else {
        // Use the updated values directly instead of relying on state
        handleFinishGameWithData(newAnswers, newScore);
      }
    }
  }

  // Helper function to finish game with specific data (to avoid closure issues)
  function handleFinishGameWithData(finalAnswers: number[], finalScore: number) {
    setGameFinished(true);
    const totalQuestions = Math.min(questionsPerGame, questions.length);
    const maxScore = questions.slice(0, totalQuestions).reduce((sum, q) => sum + q.points, 0);
    const percentage = (finalScore / maxScore) * 100;
    const passed = percentage >= passingScore;
    const result = passed ? 'win' : 'loss';

    submitMutation.mutate({
      gameId,
      result,
      gameData: {
        score: finalScore,
        maxScore,
        percentage,
        totalQuestions,
        answers: finalAnswers,
        timeSpent: timeLimit - timeRemaining,
      },
    });

    Alert.alert(
      passed ? '🎉 Congratulations!' : '😔 Game Over',
      `Score: ${finalScore}/${maxScore} (${percentage.toFixed(1)}%)\n${
        passed
          ? `You passed! You earned ${gameData?.reward_amount || 0} coins.`
          : `You need ${passingScore}% to pass. Better luck next time!`
      }`,
      [
        {
          text: 'Play Again',
          onPress: () => {
            setGameStarted(false);
            setGameFinished(false);
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setAnswers([]);
            setScore(0);
          },
        },
        {
          text: 'Back',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }

  // Original function kept for timer timeout case
  function handleFinishGame() {
    handleFinishGameWithData(answers, score);
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

  if (!gameData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Game not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!gameStarted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>

          <View style={styles.startScreen}>
            <View style={styles.gameIcon}>
              <Ionicons name="help-circle" size={64} color="#007AFF" />
            </View>
            <Text style={styles.gameTitle}>{gameData.name}</Text>
            {gameData.description && (
              <Text style={styles.gameDescription}>{gameData.description}</Text>
            )}

            <View style={styles.gameInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="list" size={20} color="#666" />
                <Text style={styles.infoText}>
                  {Math.min(questionsPerGame, questions.length)} questions
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time" size={20} color="#666" />
                <Text style={styles.infoText}>{timeLimit} seconds</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="trophy" size={20} color="#FF9500" />
                <Text style={styles.infoText}>
                  {gameData.reward_amount} coins reward
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.infoText}>{passingScore}% to pass</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
              <Text style={styles.startButtonText}>Start Quiz</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (gameFinished || questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Calculating results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedAnswer !== null && selectedAnswer === currentQuestion.correctAnswer;
  const showResult = showCorrectAnswer && selectedAnswer !== null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Alert.alert('Quit Game', 'Are you sure you want to quit?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Quit',
                  style: 'destructive',
                  onPress: () => navigation.goBack(),
                },
              ]);
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              Question {currentQuestionIndex + 1} / {Math.min(questionsPerGame, questions.length)}
            </Text>
            <Text style={styles.headerTime}>
              <Ionicons name="time" size={16} color="#FF3B30" /> {timeRemaining}s
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>Score: {score}</Text>
          </View>
        </View>

        {/* Question */}
        <ScrollView style={styles.questionContainer}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              let optionStyle = styles.option;
              let optionTextStyle = styles.optionText;

              if (showResult) {
                if (index === currentQuestion.correctAnswer) {
                  optionStyle = styles.optionCorrect;
                  optionTextStyle = styles.optionTextCorrect;
                } else if (index === selectedAnswer && index !== currentQuestion.correctAnswer) {
                  optionStyle = styles.optionIncorrect;
                  optionTextStyle = styles.optionTextIncorrect;
                }
              } else if (selectedAnswer === index) {
                optionStyle = styles.optionSelected;
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={optionStyle}
                  onPress={() => handleSelectAnswer(index)}
                  disabled={showResult}
                >
                  <Text style={optionTextStyle}>
                    {String.fromCharCode(65 + index)}. {option}
                  </Text>
                  {showResult && index === currentQuestion.correctAnswer && (
                    <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                  )}
                  {showResult &&
                    index === selectedAnswer &&
                    index !== currentQuestion.correctAnswer && (
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Next Button */}
          {selectedAnswer !== null && (
            <TouchableOpacity
              style={[
                styles.nextButton,
                (showResult && currentQuestionIndex < Math.min(questionsPerGame, questions.length) - 1) && styles.nextButtonDisabled
              ]}
              onPress={handleNextQuestion}
              disabled={showResult && currentQuestionIndex < Math.min(questionsPerGame, questions.length) - 1}
            >
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex < Math.min(questionsPerGame, questions.length) - 1
                  ? 'Next Question'
                  : 'Finish Quiz'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  startScreen: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  gameTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  gameDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  gameInfo: {
    width: '100%',
    marginBottom: 40,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerTime: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  scoreContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    lineHeight: 28,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  option: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionCorrect: {
    borderColor: '#34C759',
    backgroundColor: '#D4EDDA',
  },
  optionIncorrect: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFE5E5',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  optionTextCorrect: {
    color: '#34C759',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: '#FF3B30',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

