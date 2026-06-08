import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { paymentService } from '../services/payment.service';
import { supabase } from '../utils/supabase';

/**
 * Create a new payment session
 */
export async function createPayment(req: AuthRequest, res: Response) {
  try {
    const { amount, method, packageId, referenceType = 'coin_package' } = req.body;
    const userId = req.user!.userId;
    const ipAddr = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!amount || !method) {
      return res.status(400).json({ error: 'Amount and method are required' });
    }

    const { payment, url } = await paymentService.initiatePayment(
      userId,
      amount,
      method,
      packageId,
      referenceType,
      ipAddr as string
    );

    res.json({ payment, url });
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * VNPay Webhook (IPN)
 */
export async function vnpayWebhook(req: Request, res: Response) {
  try {
    const result = await paymentService.handleWebhook('vnpay', req.query);
    
    // VNPay expects specific JSON response for IPN
    if (result.status === 'already_processed') {
      return res.json({ RspCode: '02', Message: 'Order already confirmed' });
    }
    
    res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('VNPay Webhook error:', error);
    res.json({ RspCode: '99', Message: 'Internal Error' });
  }
}

/**
 * MoMo Webhook (IPN Callback)
 */
export async function momoWebhook(req: Request, res: Response) {
  try {
    console.log('--- Received MoMo Webhook IPN Callback ---');
    console.log('Payload:', JSON.stringify(req.body, null, 2));
    
    const result = await paymentService.handleWebhook('momo', req.body);
    
    // MoMo expects a response to confirm receipt of IPN
    const responsePayload = {
      partnerCode: req.body.partnerCode,
      orderId: req.body.orderId,
      requestId: req.body.requestId,
      resultCode: 0, // Acknowledge success processing
      message: 'Acknowledged and processed',
      responseTime: new Date().getTime(),
      extraData: req.body.extraData || '',
    };
    
    res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error('MoMo Webhook error:', error);
    res.status(500).json({ error: error.message || 'Internal webhook error' });
  }
}

/**
 * Get available coin packages
 */
export async function getCoinPackages(req: Request, res: Response) {
  try {
    const { data: packages, error } = await supabase
      .from('coin_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_vnd', { ascending: true });

    if (error) throw error;
    res.json({ packages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
}

/**
 * Get available vendor VIP packages
 */
export async function getVendorPackages(req: Request, res: Response) {
  try {
    const { data: packages, error } = await supabase
      .from('vendor_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) throw error;
    res.json({ packages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor packages' });
  }
}
