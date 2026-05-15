import React from 'react';
import { useNavigation } from '@react-navigation/native';
import NotificationToast from './NotificationToast';

/**
 * Wrapper component to provide navigation context to NotificationToast
 */
export default function NotificationToastWrapper() {
  const navigation = useNavigation();

  return (
    <NotificationToast
      onPress={(notification) => {
        try {
          (navigation as any).navigate('Notifications');
        } catch (error) {
          console.log('Navigation error:', error);
        }
      }}
    />
  );
}




















