'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  PlusCircle, 
  DollarSign, 
  Coins, 
  RefreshCw, 
  ShoppingBag, 
  Activity,
  CheckCircle,
  HelpCircle,
  LogOut,
  Send,
  User
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

// Default dynamic rates
const DEFAULT_COIN_RATE = 100.0; // 1 Coin = 100 Credits
const DEFAULT_VND_RATE = 1.0;    // 1 VND = 1 Credit

// Helper types
type DisplayCurrency = 'CREDIT' | 'COIN' | 'VND';

interface Transaction {
  id: string;
  amountCredit: number;
  paymentMethod: string;
  type: 'EARN' | 'SPEND';
  description: string;
  createdAt: Date;
}

interface Product {
  id: string;
  name: string;
  priceCredit: number;
  category: string;
  tags: string[];
}

export default function DashboardPage() {
  // Config state
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('CREDIT');
  const [userId] = useState<string>('mock-user-123');
  
  // Wallet state
  const [coinBalance, setCoinBalance] = useState<number>(350); // initial 350 Coins = 35,000 Credits
  const [vndBalance, setVndBalance] = useState<number>(75000); // initial 75,000 VND = 75,000 Credits
  
  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'TX001',
      amountCredit: 10000,
      paymentMethod: 'VND',
      type: 'EARN',
      description: 'Welcome Bonus Credited',
      createdAt: new Date(Date.now() - 3600000 * 24 * 5),
    },
    {
      id: 'TX002',
      amountCredit: 5000,
      paymentMethod: 'COIN',
      type: 'SPEND',
      description: 'Purchased Virtual Gaming Mouse',
      createdAt: new Date(Date.now() - 3600000 * 24 * 3),
    },
    {
      id: 'TX003',
      amountCredit: 25000,
      paymentMethod: 'VND',
      type: 'SPEND',
      description: 'Purchased Virtual Smartphone Case',
      createdAt: new Date(Date.now() - 3600000 * 12),
    },
  ]);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `Hello! I'm your HMall AI Financial Coach. 🧑‍💻\n\nI can analyze your spending category distribution, budget alerts, and help you save effectively. Ask me anything about your virtual assets or how to allocate your credits!`,
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isCoachLoading, setIsCoachLoading] = useState<boolean>(false);

  // Budgets state
  const [budgetLimit, setBudgetLimit] = useState<number>(120000); // 120,000 Credits
  const [budgetInput, setBudgetInput] = useState<string>('120000');

  // Input states
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [topUpCurrency, setTopUpCurrency] = useState<'COIN' | 'VND'>('COIN');
  const [spendAmount, setSpendAmount] = useState<string>('');
  const [spendCurrency, setSpendCurrency] = useState<'COIN' | 'VND'>('COIN');
  const [spendCategory, setSpendCategory] = useState<string>('Electronics');
  const [spendName, setSpendName] = useState<string>('');

  // API connectivity status
  const [backendOnline, setBackendOnline] = useState<boolean>(false);

  // Dynamic products list
  const [availableProducts] = useState<Product[]>([
    { id: 'p1', name: 'Gaming Headset', priceCredit: 12000, category: 'Electronics', tags: ['gaming', 'audio'] },
    { id: 'p2', name: 'Ergonomic Desk Chair', priceCredit: 45000, category: 'Furniture', tags: ['office', 'health'] },
    { id: 'p3', name: 'Mechanical Keyboard', priceCredit: 18000, category: 'Electronics', tags: ['gaming', 'typing'] },
    { id: 'p4', name: 'LED Smart Lightbulb', priceCredit: 6000, category: 'Home Decor', tags: ['smart', 'lighting'] },
    { id: 'p5', name: 'Python Programming Guide', priceCredit: 2500, category: 'Education', tags: ['book', 'coding'] },
  ]);

  // Check backend connectivity on startup
  useEffect(() => {
    fetch('http://localhost:3004/api/wallet/balance?userId=test')
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // Format Helper based on active currency switch
  const formatValue = (creditValue: number) => {
    if (displayCurrency === 'COIN') {
      const value = creditValue / DEFAULT_COIN_RATE;
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} COIN`;
    }
    if (displayCurrency === 'VND') {
      const value = creditValue / DEFAULT_VND_RATE;
      return `${value.toLocaleString()} VND`;
    }
    return `${creditValue.toLocaleString()} Credits`;
  };

  // Conversions
  const totalCredits = coinBalance * DEFAULT_COIN_RATE + vndBalance * DEFAULT_VND_RATE;

  // Handle mock top up
  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(topUpAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    let creditsAdded = 0;
    if (topUpCurrency === 'COIN') {
      setCoinBalance(prev => prev + parsedAmount);
      creditsAdded = parsedAmount * DEFAULT_COIN_RATE;
    } else {
      setVndBalance(prev => prev + parsedAmount);
      creditsAdded = parsedAmount * DEFAULT_VND_RATE;
    }

    const newTx: Transaction = {
      id: `TX${Math.floor(Math.random() * 10000)}`,
      amountCredit: creditsAdded,
      paymentMethod: topUpCurrency,
      type: 'EARN',
      description: `Account Top-up (${parsedAmount} ${topUpCurrency})`,
      createdAt: new Date(),
    };

    setTransactions(prev => [newTx, ...prev]);
    setTopUpAmount('');

    // Try posting to NestJS backend in parallel
    if (backendOnline) {
      fetch('http://localhost:3004/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: parsedAmount,
          currencyType: topUpCurrency,
          description: `Top up via Web Console`,
        }),
      }).catch(err => console.log('Sync to backend failed: ', err));
    }
  };

  // Handle mock purchase / spend
  const handleSpend = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(spendAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !spendName.trim()) return;

    // Convert requested spend amount to Credits
    let creditCost = 0;
    if (spendCurrency === 'COIN') {
      creditCost = parsedAmount * DEFAULT_COIN_RATE;
    } else {
      creditCost = parsedAmount * DEFAULT_VND_RATE;
    }

    // Check balance
    if (spendCurrency === 'COIN' && coinBalance < parsedAmount) {
      alert('Insufficient Coin Balance!');
      return;
    }
    if (spendCurrency === 'VND' && vndBalance < parsedAmount) {
      alert('Insufficient VND Balance!');
      return;
    }

    // Deduct
    if (spendCurrency === 'COIN') {
      setCoinBalance(prev => prev - parsedAmount);
    } else {
      setVndBalance(prev => prev - parsedAmount);
    }

    const newTx: Transaction = {
      id: `TX${Math.floor(Math.random() * 10000)}`,
      amountCredit: creditCost,
      paymentMethod: spendCurrency,
      type: 'SPEND',
      description: `${spendName.trim()} (${spendCategory})`,
      createdAt: new Date(),
    };

    setTransactions(prev => [newTx, ...prev]);
    setSpendAmount('');
    setSpendName('');

    // Try posting to NestJS backend
    if (backendOnline) {
      fetch('http://localhost:3004/api/wallet/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amountCredit: creditCost,
          paymentMethod: spendCurrency,
          description: `Purchased ${spendName}`,
        }),
      }).catch(err => console.log('Sync to backend failed: ', err));
    }
  };

  // Quick purchase utility
  const triggerQuickBuy = (product: Product, currency: 'COIN' | 'VND') => {
    const costCredit = product.priceCredit;
    const rawCost = currency === 'COIN' ? costCredit / DEFAULT_COIN_RATE : costCredit / DEFAULT_VND_RATE;

    if (currency === 'COIN' && coinBalance < rawCost) {
      alert('Insufficient Coin balance for quick purchase!');
      return;
    }
    if (currency === 'VND' && vndBalance < rawCost) {
      alert('Insufficient VND balance for quick purchase!');
      return;
    }

    if (currency === 'COIN') {
      setCoinBalance(prev => prev - rawCost);
    } else {
      setVndBalance(prev => prev - rawCost);
    }

    const newTx: Transaction = {
      id: `TX${Math.floor(Math.random() * 10000)}`,
      amountCredit: costCredit,
      paymentMethod: currency,
      type: 'SPEND',
      description: `Quick Purchase: ${product.name}`,
      createdAt: new Date(),
    };

    setTransactions(prev => [newTx, ...prev]);

    if (backendOnline) {
      fetch('http://localhost:3004/api/wallet/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amountCredit: costCredit,
          paymentMethod: currency,
          description: `Quick buy: ${product.name}`,
        }),
      }).catch(err => console.log('Sync failed: ', err));
    }
  };

  // Category distributions computations for chart
  const categoriesMap: Record<string, number> = {};
  let totalSpends = 0;

  transactions
    .filter(t => t.type === 'SPEND')
    .forEach(t => {
      // Extract category from description (e.g. "Mouse (Electronics)" -> "Electronics")
      const match = t.description.match(/\(([^)]+)\)/);
      const cat = match ? match[1] : 'Shopping';
      categoriesMap[cat] = (categoriesMap[cat] || 0) + t.amountCredit;
      totalSpends += t.amountCredit;
    });

  const pieData = Object.entries(categoriesMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Fallback default if empty spends
  const finalPieData = pieData.length > 0 ? pieData : [
    { name: 'Electronics', value: 15000 },
    { name: 'Home Decor', value: 8000 },
    { name: 'Books', value: 3000 },
  ];

  const COLORS = ['#6366F1', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  // Trend data comparisons
  const barData = [
    { name: 'Previous Month', Spend: totalSpends * 0.8 },
    { name: 'Current Month', Spend: totalSpends || 26000 },
  ];

  // Budget calculations
  const remainingBudget = Math.max(0, budgetLimit - totalSpends);
  const budgetPercentage = budgetLimit > 0 ? Math.min(100, Math.round((totalSpends / budgetLimit) * 100)) : 0;
  
  // Forecast calculations (Moving average simulation)
  const daysPassed = 5;
  const averageDailySpend = totalSpends / daysPassed;
  const daysRemaining = averageDailySpend > 0 ? Math.max(0, Math.floor(remainingBudget / averageDailySpend)) : 30;
  const budgetStatus = daysRemaining < 15 ? 'At Risk' : 'Healthy';

  // AI Recommendations
  const aiRecommendations = [
    { product: availableProducts[0], score: 0.94, reason: 'Similar users purchased Gaming products' },
    { product: availableProducts[2], score: 0.88, reason: 'Complements your recent purchase of Gaming Mouse' },
    { product: availableProducts[4], score: 0.75, reason: 'Top-rated product in your Education interest list' },
  ];

  // Send AI chat message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsCoachLoading(true);

    if (backendOnline) {
      // Connect to OpenAI advisor inside backend
      try {
        const response = await fetch('http://localhost:3004/api/ai/financial-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.advice }]);
      } catch (err) {
        // Fallback to local intelligence if endpoint fails
        simulateLocalAdvisorResponse(userMessage);
      } finally {
        setIsCoachLoading(false);
      }
    } else {
      // Simulate local advisor delay & logic
      setTimeout(() => {
        simulateLocalAdvisorResponse(userMessage);
        setIsCoachLoading(false);
      }, 800);
    }
  };

  const simulateLocalAdvisorResponse = (prompt: string) => {
    const q = prompt.toLowerCase();
    let reply = '';

    if (q.includes('budget') || q.includes('save') || q.includes('exceed')) {
      reply = `### Budget Forecast Analysis 📊\n\nYour current budget limit is set to **${formatValue(budgetLimit)}**. So far, you have spent **${formatValue(totalSpends)}** (${budgetPercentage}%).\n\nBased on your average daily spend of **${formatValue(averageDailySpend)}/day**, you will exceed your budget limits in **${daysRemaining} days**.\n\n**Suggestions:**\n1. Stop purchasing **Electronics** products for the next 7 days.\n2. Add a sub-budget for entertainment items.`;
    } else if (q.includes('coin') || q.includes('vnd') || q.includes('currency') || q.includes('credit')) {
      reply = `### Currency Architecture Coach 🪙\n\nHMall uses **Credits** as the unified source of truth. Your total worth is **${formatValue(totalCredits)}**.\n\n* **Coin Exchange Rate**: 1 Coin = 100 Credits (You have: **${coinBalance} Coins**)\n* **VND Exchange Rate**: 1 VND = 1 Credit (You have: **${vndBalance.toLocaleString()} VND**)\n\nYou can pay with either currency, and the wallet will dynamically deduct the correct amount and report in Credits!`;
    } else if (q.includes('recommend') || q.includes('buy')) {
      reply = `### Product Interest Analysis 🎯\n\nLooking at your favorites, I recommend purchasing the **${availableProducts[0].name}** (Electronics, scored **94%** matching) or the **${availableProducts[2].name}** (Electronics, scored **88%** matching).\n\nBuying items from similar categories helps maximize cashback rewards.`;
    } else {
      reply = `### Financial Coach Advice 💡\n\nI've analyzed your financial ledger. Here are the core insights:\n\n* **Top Spending Category**: Electronics (${budgetPercentage}% of budget)\n* **Monthly Trend**: Spending is currently pacing at **${budgetPercentage}%** of your limits.\n* **Action Plan**: Allocate at least **15%** of top-ups to your savings target before committing purchases.\n\nFeel free to ask specific questions about your balance, budget, or coin ratios!`;
    }

    setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
  };

  return (
    <div className="flex flex-col flex-1 pb-12">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-400">
                HMall
              </span>
              <span className="text-xs block text-slate-400 font-semibold uppercase tracking-wider">AI Financial Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setDisplayCurrency('CREDIT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${displayCurrency === 'CREDIT' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Credits
              </button>
              <button 
                onClick={() => setDisplayCurrency('COIN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${displayCurrency === 'COIN' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Coins
              </button>
              <button 
                onClick={() => setDisplayCurrency('VND')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${displayCurrency === 'VND' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                VND
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-300">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {backendOnline ? 'Server Connected' : 'Local Sandbox Mode'}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 mt-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: WALLET & TRANSACTION MOCKER */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Wallet Balance Card */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur shadow-2xl">
              {/* Blur gradients decoration */}
              <div className="absolute -right-20 -top-20 w-44 h-44 rounded-full bg-indigo-500/10 blur-3xl"></div>
              <div className="absolute -left-20 -bottom-20 w-44 h-44 rounded-full bg-purple-500/10 blur-3xl"></div>

              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                  <Wallet className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">User Wallet</span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-slate-400 block mb-1">Total Net Worth</span>
                  <div className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    {formatValue(totalCredits)}
                  </div>
                </div>

                <div className="h-px bg-slate-800 my-4"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-slate-400">Coins</span>
                    </div>
                    <div className="text-lg font-bold text-slate-200">{coinBalance}</div>
                    <span className="text-[10px] text-slate-500 font-medium">({(coinBalance * DEFAULT_COIN_RATE).toLocaleString()} Credits)</span>
                  </div>

                  <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-slate-400">VND</span>
                    </div>
                    <div className="text-lg font-bold text-slate-200">{vndBalance.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-500 font-medium">({(vndBalance * DEFAULT_VND_RATE).toLocaleString()} Credits)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Operations Panel */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
              <h3 className="text-md font-bold mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" /> Wallet Operations (Top up)
              </h3>
              
              <form onSubmit={handleTopUp} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Currency Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTopUpCurrency('COIN')}
                      className={`py-2 rounded-xl text-xs font-bold border ${topUpCurrency === 'COIN' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-350'}`}
                    >
                      Coins (x100 rate)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopUpCurrency('VND')}
                      className={`py-2 rounded-xl text-xs font-bold border ${topUpCurrency === 'VND' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-350'}`}
                    >
                      VND (x1 rate)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Top Up
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Spend Sandbox Panel */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
              <h3 className="text-md font-bold mb-4 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-rose-500" /> Spend Sandbox (Purchase)
              </h3>
              
              <form onSubmit={handleSpend} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Product Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mechanical Keyboard"
                    value={spendName}
                    onChange={(e) => setSpendName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Category</label>
                    <select
                      value={spendCategory}
                      onChange={(e) => setSpendCategory(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Home Decor">Home Decor</option>
                      <option value="Education">Education</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Pay Method</label>
                    <select
                      value={spendCurrency}
                      onChange={(e) => setSpendCurrency(e.target.value as any)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="COIN">Coins</option>
                      <option value="VND">VND</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Amount ({spendCurrency})</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={spendAmount}
                      onChange={(e) => setSpendAmount(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Spend
                    </button>
                  </div>
                </div>
              </form>
            </div>

          </div>

          {/* MIDDLE COLUMN: CHARTS, FORECAST, RECOMMENDATIONS */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Charts & Budget Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Category Breakdown Pie Chart */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
                <h3 className="text-md font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" /> Spending Distribution
                </h3>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={finalPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {finalPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => formatValue(val)}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      />
                      <Legend 
                        iconType="circle"
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Budget Forecasting Component */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" /> Expense Budget & Forecast
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${budgetStatus === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'}`}>
                      {budgetStatus}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-400">Monthly Category Budget</span>
                        <span className="text-slate-200">{formatValue(totalSpends)} / {formatValue(budgetLimit)}</span>
                      </div>
                      
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                          style={{ width: `${budgetPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-0.5">Safety Margin</span>
                        <span className="text-sm font-bold text-slate-200">{formatValue(remainingBudget)}</span>
                      </div>

                      <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-0.5">Days to Exceed</span>
                        <span className="text-sm font-bold text-slate-200">{daysRemaining} Days</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Adjust Budget Limit (Credits)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-600 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setBudgetLimit(Number(budgetInput) || 0)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* AI Recommendation Panel */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
              <h3 className="text-md font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> AI Product Recommendations
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 hover:border-slate-700/80 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-indigo-400 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                          Score {Math.round(rec.score * 100)}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">{rec.product.category}</span>
                      </div>
                      <h4 className="font-bold text-slate-200 text-sm mb-1">{rec.product.name}</h4>
                      <p className="text-xs text-slate-400 leading-normal mb-3">{rec.reason}</p>
                    </div>

                    <div>
                      <div className="text-xs font-extrabold text-slate-300 mb-2">{formatValue(rec.product.priceCredit)}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => triggerQuickBuy(rec.product, 'COIN')}
                          className="py-1.5 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-lg text-[10px] font-bold transition"
                        >
                          Buy with Coins
                        </button>
                        <button
                          onClick={() => triggerQuickBuy(rec.product, 'VND')}
                          className="py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold transition"
                        >
                          Buy with VND
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Financial Coach Chat Panel */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur relative overflow-hidden">
              <div className="absolute -right-24 -bottom-24 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl"></div>
              
              <h3 className="text-md font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" /> AI Financial Coach Chatbot
              </h3>

              <div className="h-64 border border-slate-800 bg-slate-950/80 rounded-2xl p-4 overflow-y-auto mb-4 flex flex-col gap-4 text-sm scrollbar-thin">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                      {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className={`p-3 rounded-2xl whitespace-pre-line leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isCoachLoading && (
                  <div className="self-start flex gap-3 items-center text-xs text-slate-500">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    </div>
                    <span>AI Coach is analyzing your transactions...</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChatMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask advisor: 'Will I exceed budget?', 'Explain exchange rate', or custom requests..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-600"
                />
                <button
                  type="submit"
                  disabled={isCoachLoading}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition duration-200 disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Ledger Transactions table */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
              <h3 className="text-md font-bold mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Transaction Ledger</span>
                <span className="text-xs text-slate-500 font-medium font-mono">Credits Accounting</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3 pr-4">TxID</th>
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Description</th>
                      <th className="pb-3 pr-4">Method</th>
                      <th className="pb-3 text-right">Value (Credits)</th>
                      <th className="pb-3 text-right">Value (Display)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="text-slate-300 hover:bg-slate-950/20 transition-all">
                        <td className="py-3 font-mono font-bold text-slate-400 pr-4">{tx.id}</td>
                        <td className="py-3 pr-4 text-slate-500 font-medium">
                          {tx.createdAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${tx.type === 'EARN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-slate-200">{tx.description}</td>
                        <td className="py-3 pr-4 font-mono font-bold text-slate-400">{tx.paymentMethod}</td>
                        <td className={`py-3 text-right font-bold pr-4 font-mono ${tx.type === 'EARN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.type === 'EARN' ? '+' : '-'}{tx.amountCredit.toLocaleString()}
                        </td>
                        <td className={`py-3 text-right font-bold font-mono ${tx.type === 'EARN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.type === 'EARN' ? '+' : '-'}{formatValue(tx.amountCredit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
