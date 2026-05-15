/**
 * Game Engine Service
 * Handles game configuration validation, loading, and execution
 */

/**
 * Validate game configuration against JSON schema
 */
export function validateGameConfig(
  config: any,
  schema: any
): { isValid: boolean; errors?: string[] } {
  try {
    const errors: string[] = [];

    // Basic validation - check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (config[field] === undefined || config[field] === null) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [key, value] of Object.entries(config)) {
        const propertySchema = schema.properties[key];
        if (propertySchema) {
          // Type validation
          if (propertySchema.type) {
            const expectedType = propertySchema.type;
            const actualType = Array.isArray(config[key]) ? 'array' : typeof config[key];

            if (expectedType === 'number' && isNaN(config[key])) {
              errors.push(`Field '${key}' must be a number`);
            } else if (expectedType === 'boolean' && typeof config[key] !== 'boolean') {
              errors.push(`Field '${key}' must be a boolean`);
            } else if (expectedType === 'string' && typeof config[key] !== 'string') {
              errors.push(`Field '${key}' must be a string`);
            } else if (expectedType === 'array' && !Array.isArray(config[key])) {
              errors.push(`Field '${key}' must be an array`);
            }
          }

          // Min/Max validation for numbers
          if (propertySchema.type === 'number') {
            if (propertySchema.minimum !== undefined && config[key] < propertySchema.minimum) {
              errors.push(`Field '${key}' must be at least ${propertySchema.minimum}`);
            }
            if (propertySchema.maximum !== undefined && config[key] > propertySchema.maximum) {
              errors.push(`Field '${key}' must be at most ${propertySchema.maximum}`);
            }
          }

          // Enum validation
          if (propertySchema.enum && !propertySchema.enum.includes(config[key])) {
            errors.push(`Field '${key}' must be one of: ${propertySchema.enum.join(', ')}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Config validation error:', error);
    return {
      isValid: false,
      errors: ['Validation error occurred'],
    };
  }
}

/**
 * Load game instance with all related data
 */
export async function loadGameInstance(gameInstanceId: string) {
  // This will be implemented in the controller
  // Returns game instance with content and assets
}

/**
 * Calculate game score based on game type and results
 */
export function calculateGameScore(
  gameType: string,
  config: any,
  results: any
): { score: number; passed: boolean } {
  switch (gameType) {
    case 'quiz':
      return calculateQuizScore(config, results);
    case 'memory_match':
      return calculateMemoryMatchScore(config, results);
    case 'trivia':
      return calculateTriviaScore(config, results);
    default:
      return { score: 0, passed: false };
  }
}

/**
 * Calculate quiz game score
 */
function calculateQuizScore(config: any, results: any): { score: number; passed: boolean } {
  const { questions = [], answers = [], timeSpent = 0 } = results;
  let correctCount = 0;
  let totalPoints = 0;

  questions.forEach((question: any, index: number) => {
    if (answers[index] === question.correctAnswer) {
      correctCount++;
      totalPoints += question.points || 10;
    }
  });

  const percentage = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
  const passingScore = config.passingScore || 70;
  const passed = percentage >= passingScore;

  // Time bonus (optional)
  let timeBonus = 0;
  if (config.timeBonus && config.timeLimit) {
    const timeRemaining = config.timeLimit - timeSpent;
    if (timeRemaining > 0) {
      timeBonus = Math.floor(timeRemaining / 10); // 1 point per 10 seconds remaining
    }
  }

  return {
    score: totalPoints + timeBonus,
    passed,
  };
}

/**
 * Calculate memory match game score
 */
function calculateMemoryMatchScore(config: any, results: any): { score: number; passed: boolean } {
  const { matches = 0, attempts = 0, timeSpent = 0 } = results;
  const totalPairs = getTotalPairsFromGridSize(config.gridSize || '4x4');
  const score = matches * (config.matchPoints || 5);
  const passed = matches === totalPairs;

  return { score, passed };
}

/**
 * Calculate trivia game score
 */
function calculateTriviaScore(config: any, results: any): { score: number; passed: boolean } {
  const { correctAnswers = 0, totalQuestions = 0 } = results;
  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const score = correctAnswers * 10; // 10 points per correct answer
  const passed = percentage >= 50; // 50% passing score

  return { score, passed };
}

/**
 * Helper: Get total pairs from grid size
 */
function getTotalPairsFromGridSize(gridSize: string): number {
  const [rows, cols] = gridSize.split('x').map(Number);
  return (rows * cols) / 2;
}







