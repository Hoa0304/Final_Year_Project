import { Response } from 'express';
import { supabase } from '../utils/supabase';
import { getUserTransactions } from '../services/transaction.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get user's current virtual balance
 */
export async function getBalance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { data: user, error } = await supabase
      .from('users')
      .select('virtual_balance')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ balance: user.virtual_balance });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user's transaction history
 * Supports pagination with limit and offset query parameters
 */
export async function getTransactions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await getUserTransactions(userId, limit, offset);

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user profile information
 */
export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, virtual_balance, avatar_url, phone, bio, address, date_of_birth')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        balance: user.virtual_balance,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        bio: user.bio,
        address: user.address,
        dateOfBirth: user.date_of_birth,
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update user profile information
 */
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { fullName, avatarUrl, phone, bio, address, dateOfBirth } = req.body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (fullName !== undefined) updateData.full_name = fullName || null;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (bio !== undefined) updateData.bio = bio || null;
    if (address !== undefined) updateData.address = address || null;
    if (dateOfBirth !== undefined) updateData.date_of_birth = dateOfBirth || null;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, full_name, role, virtual_balance, avatar_url, phone, bio, address, date_of_birth')
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        balance: user.virtual_balance,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        bio: user.bio,
        address: user.address,
        dateOfBirth: user.date_of_birth,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


