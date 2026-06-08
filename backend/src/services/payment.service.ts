import { env } from '../config/env';
import crypto from 'crypto';
import { supabase } from '../utils/supabase';

/**
 * Payment Provider Interface
 */
export interface PaymentProvider {
  name: string;
  createPaymentUrl(params: {
    amount: number;
    orderId: string;
    orderInfo: string;
    returnUrl: string;
    ipAddr: string;
  }): Promise<string>;
  verifyCallback(params: any): Promise<{
    success: boolean;
    orderId: string;
    amount: number;
    transactionId: string;
    rawResponse: any;
  }>;
}

/**
 * VNPay Strategy Implementation
 */
export class VNPayProvider implements PaymentProvider {
  name = 'vnpay';

  async createPaymentUrl(params: any): Promise<string> {
    const { amount, orderId, orderInfo, returnUrl, ipAddr } = params;
    
    // VNPay configuration (should be in env)
    const tmnCode = env.VNP_TMN_CODE;
    const hashSecret = env.VNP_HASH_SECRET;
    const vnpUrl = env.VNP_URL;

    const date = new Date();
    const createDate = this.formatDate(date);
    
    let vnp_Params: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: amount * 100, // VNPay amount is in cents
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // Sort params alphabetically
    vnp_Params = this.sortObject(vnp_Params);

    const signData = new URLSearchParams(vnp_Params).toString();
    const hmac = crypto.createHmac('sha512', hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    vnp_Params['vnp_SecureHash'] = signed;
    
    const query = new URLSearchParams(vnp_Params).toString();
    return `${vnpUrl}?${query}`;
  }

  async verifyCallback(params: any): Promise<any> {
    const vnp_Params = params;
    const secureHash = vnp_Params['vnp_SecureHash'];
    const hashSecret = env.VNP_HASH_SECRET;

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnp_Params);
    const signData = new URLSearchParams(sortedParams).toString();
    
    const hmac = crypto.createHmac('sha512', hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isSuccess = secureHash === signed && vnp_Params['vnp_ResponseCode'] === '00';

    return {
      success: isSuccess,
      orderId: vnp_Params['vnp_TxnRef'],
      amount: parseInt(vnp_Params['vnp_Amount']) / 100,
      transactionId: vnp_Params['vnp_TransactionNo'],
      rawResponse: params
    };
  }

  private sortObject(obj: any) {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return date.getFullYear() +
      pad(date.getMonth() + 1).toString() +
      pad(date.getDate()).toString() +
      pad(date.getHours()).toString() +
      pad(date.getMinutes()).toString() +
      pad(date.getSeconds()).toString();
  }
}

/**
 * MoMo Sandbox Strategy Implementation
 */
export class MomoProvider implements PaymentProvider {
  name = 'momo';

  async createPaymentUrl(params: any): Promise<string> {
    const { amount, orderId, orderInfo, returnUrl, ipAddr } = params;

    const partnerCode = env.MOMO_PARTNER_CODE;
    const accessKey = env.MOMO_ACCESS_KEY;
    const secretKey = env.MOMO_SECRET_KEY;
    const apiEndpoint = env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';

    const requestId = orderId;
    const extraData = '';
    const requestType = 'captureWallet';
    // User redirection after payment
    const redirectUrl = returnUrl.replace('momo-webhook', 'momo-callback');
    const ipnUrl = returnUrl; // Webhook callback URL

    // Create raw signature string
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode,
      partnerName: 'HMall Store',
      storeId: 'HMall',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature,
    };

    try {
      const axios = (await import('axios')).default;
      console.log('--- Initiating MoMo Sandbox payment ---');
      console.log('Payload:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(apiEndpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
      });

      if (response.data && response.data.payUrl) {
        return response.data.payUrl;
      } else {
        throw new Error(response.data.message || 'Failed to generate MoMo payment URL');
      }
    } catch (error: any) {
      console.error('MoMo Create Payment Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Error connecting to MoMo Sandbox Gateway');
    }
  }

  async verifyCallback(params: any): Promise<any> {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = params;

    const secretKey = env.MOMO_SECRET_KEY;
    const accessKey = env.MOMO_ACCESS_KEY;

    // Verify signature
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const computedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const isSignatureValid = computedSignature === signature;
    const isSuccess = isSignatureValid && Number(resultCode) === 0;

    return {
      success: isSuccess,
      orderId,
      amount: Number(amount),
      transactionId: transId || '',
      rawResponse: params,
    };
  }
}

/**
 * Payment Service Context
 */
export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.providers.set('vnpay', new VNPayProvider());
    this.providers.set('momo', new MomoProvider());
  }

  async initiatePayment(userId: string, amount: number, method: string, referenceId: string, referenceType: string, ipAddr: string) {
    const provider = this.providers.get(method);
    if (!provider) throw new Error('Unsupported payment method');

    // 1. Create local payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount,
        currency: 'VND',
        status: 'pending',
        method: method as any,
        reference_id: referenceId,
        reference_type: referenceType
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Generate Gateway URL
    const url = await provider.createPaymentUrl({
      amount,
      orderId: payment.id,
      orderInfo: `HMall Payment for ${referenceType}`,
      returnUrl: `${env.API_URL || 'http://localhost:3002'}/api/payment/${method}-webhook`,
      ipAddr
    });

    return { payment, url };
  }

  async handleWebhook(method: string, params: any) {
    const provider = this.providers.get(method);
    if (!provider) throw new Error('Unsupported payment method');

    const result = await provider.verifyCallback(params);

    // 1. Get payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', result.orderId)
      .single();

    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'pending') return { status: 'already_processed' };

    // 2. Update status
    const status = result.success ? 'paid' : 'failed';
    await supabase
      .from('payments')
      .update({ status })
      .eq('id', payment.id);

    // 3. Log transaction
    await supabase.from('payment_transactions').insert({
      payment_id: payment.id,
      external_id: result.transactionId,
      provider: method,
      raw_response: result.rawResponse,
      signature_valid: true
    });

    // 4. Fulfill order (Credit coins, etc.)
    if (result.success) {
      await this.fulfillPayment(payment);
    }

    return { status, payment };
  }

  private async fulfillPayment(payment: any) {
    if (payment.reference_type === 'coin_package') {
      const { data: pkg } = await supabase.from('coin_packages').select('coins').eq('id', payment.reference_id).single();
      if (pkg) {
        const { createTransaction } = await import('./transaction.service');
        await createTransaction({
          userId: payment.user_id,
          type: 'earn',
          amount: pkg.coins,
          description: `Purchased coin package via ${payment.method}`,
          referenceId: payment.id,
          referenceType: 'payment'
        });
      }
    } else if (payment.reference_type === 'vendor_vip') {
      const { activateSubscription } = await import('./subscription.service');
      await activateSubscription(payment.user_id, payment.reference_id);
    }
  }
}

export const paymentService = new PaymentService();
