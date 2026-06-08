import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth.middleware';
import { createTransaction } from '../services/transaction.service';

/**
 * Register a new user
 * Validates input, checks if email exists, hashes password, creates user
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body;

    console.log('📝 Registration request received:', { email, fullName });

    // Input validation
    if (!email || !password) {
      console.log('❌ Validation failed: Email and password are required');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      console.log('❌ Validation failed: Password too short');
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    console.log('✅ Email is available, creating user...');

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with initial balance of 0
    // We'll create a transaction to grant initial balance (so it's recorded on blockchain)
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName || null,
        virtual_balance: 0.00 // Start with 0, will be updated by transaction
      })
      .select('id, email, full_name, role, virtual_balance')
      .single();

    if (error) {
      console.error('❌ Database error creating user:', error);
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Grant initial balance (10,000 coins) as a transaction
    // This ensures it's recorded on blockchain for transparency
    try {
      const INITIAL_BALANCE = 10000.00;
      console.log(`💰 Granting initial balance of ${INITIAL_BALANCE} coins to user ${user.id}`);
      const transactionId = await createTransaction({
        userId: user.id,
        type: 'grant',
        amount: INITIAL_BALANCE,
        description: 'Welcome bonus - Initial account balance',
        referenceType: 'initial_balance',
      });
      console.log(`✅ Initial balance of ${INITIAL_BALANCE} coins granted. Transaction ID: ${transactionId}`);
      
      // Verify transaction was created
      const { data: verifyTx } = await supabase
        .from('transactions')
        .select('id, type, amount, balance_before, balance_after')
        .eq('id', transactionId)
        .single();
      
      if (verifyTx) {
        console.log(`✅ Transaction verified in database:`, verifyTx);
      } else {
        console.warn(`⚠️ Transaction ${transactionId} not found in database after creation`);
      }
    } catch (txError: any) {
      // If transaction creation fails, try to update balance directly as fallback
      console.error('⚠️ Failed to create initial balance transaction:', txError);
      console.error('   Error details:', txError.message);
      try {
        await supabase
          .from('users')
          .update({ virtual_balance: 10000.00 })
          .eq('id', user.id);
        console.log('⚠️ Fallback: Set balance directly to 10000 (not recorded on blockchain)');
      } catch (fallbackError: any) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw new Error('Failed to set initial balance');
      }
    }

    // Get updated user with final balance
    const { data: updatedUser } = await supabase
      .from('users')
      .select('id, email, full_name, role, virtual_balance')
      .eq('id', user.id)
      .single();

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    console.log('✅ User created successfully:', updatedUser?.email || user.email);
    console.log('   User ID:', user.id);
    console.log('   Balance:', updatedUser?.virtual_balance || user.virtual_balance);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: updatedUser?.email || user.email,
        fullName: updatedUser?.full_name || user.full_name,
        role: updatedUser?.role || user.role,
        balance: updatedUser?.virtual_balance || user.virtual_balance
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Login user
 * Validates credentials, returns JWT token
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, full_name, role, virtual_balance')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        balance: user.virtual_balance
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get current user information
 * Requires authentication
 */
export async function getMe(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, virtual_balance, created_at')
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
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Refresh JWT token
 * Validates current token and issues new one
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const { verifyToken } = await import('../utils/jwt');
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify user still exists
    const { data: user } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new token
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.json({ token: newToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

