/**
 * Groq AI Service
 * Handles communication with Groq API for AI chatbot
 */

import Groq from 'groq-sdk';
import { env } from '../config/env';

const GROQ_API_KEY = env.GROQ_API_KEY;

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  finish_reason?: string;
}

/**
 * Send a message to Groq AI and get response
 * Uses the Responses API for better performance
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  model: string = 'llama-3.3-70b-versatile'
): Promise<ChatResponse> {
  try {
    // Convert messages to Groq format
    const groqMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Sanitize messages to prevent sensitive data exposure
    const sanitizedMessages = groqMessages.map(msg => ({
      role: msg.role,
      content: sanitizeMessage(msg.content),
    }));

    // Use chat completions API (more reliable than responses API)
    const completion = await groq.chat.completions.create({
      model: model,
      messages: sanitizedMessages as any,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantMessage = completion.choices[0]?.message?.content || '';
    const finishReason = completion.choices[0]?.finish_reason || 'stop';

    return {
      message: assistantMessage,
      model: completion.model || model,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        total_tokens: completion.usage?.total_tokens,
      },
      finish_reason: finishReason,
    };
  } catch (error: any) {
    console.error('Groq API error:', error);
    
    // Handle specific error types
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.status === 401) {
      throw new Error('Invalid API key. Please contact administrator.');
    } else if (error.status === 400) {
      throw new Error('Invalid request. Please check your message.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Request timeout. Please try again.');
    }
    
    throw new Error('Failed to get AI response. Please try again later.');
  }
}

/**
 * Check if user has AI access
 */
export function hasAIAccess(email: string): boolean {
  return true; // All users have access in HMall
}

/**
 * Get available Groq models
 */
export function getAvailableModels(): string[] {
  return [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma-7b-it',
  ];
}

/**
 * Sanitize message content to prevent sensitive data exposure
 */
function sanitizeMessage(content: string): string {
  // Remove potential sensitive patterns (basic implementation)
  // TODO: Implement more sophisticated sanitization
  let sanitized = content;
  
  // Remove email patterns (optional - may want to keep for context)
  // sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  
  // Remove potential credit card patterns
  sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');
  
  // Limit message length
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000) + '...';
  }
  
  return sanitized;
}

