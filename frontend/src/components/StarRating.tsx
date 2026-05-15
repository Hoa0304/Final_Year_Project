import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number; // Current rating (0-5)
  maxRating?: number; // Maximum rating (default 5)
  size?: number; // Star size (default 20)
  color?: string; // Star color (default '#FFD700')
  emptyColor?: string; // Empty star color (default '#E0E0E0')
  readonly?: boolean; // If true, stars are not clickable
  showRating?: boolean; // Show numeric rating text
  onRatingChange?: (rating: number) => void; // Callback when rating changes
  style?: any; // Additional styles
}

export default function StarRating({
  rating = 0,
  maxRating = 5,
  size = 20,
  color = '#FFD700',
  emptyColor = '#E0E0E0',
  readonly = false,
  showRating = false,
  onRatingChange,
  style,
}: StarRatingProps) {
  const handleStarPress = (selectedRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(selectedRating);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {Array.from({ length: maxRating }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.round(rating);
          const isHalf = !isFilled && starValue - 0.5 <= rating;

          return (
            <TouchableOpacity
              key={starValue}
              onPress={() => handleStarPress(starValue)}
              disabled={readonly}
              activeOpacity={readonly ? 1 : 0.7}
              style={styles.starButton}
            >
              <Ionicons
                name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
                size={size}
                color={isFilled || isHalf ? color : emptyColor}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {showRating && (
        <Text style={[styles.ratingText, { fontSize: size * 0.7 }]}>
          {rating > 0 ? rating.toFixed(1) : 'No rating'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
  ratingText: {
    marginLeft: 8,
    color: '#666',
    fontWeight: '500',
  },
});

























