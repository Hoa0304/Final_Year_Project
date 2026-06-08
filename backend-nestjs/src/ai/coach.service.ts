import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class CoachService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async getFinancialAdvice(expenseReport: any, budgetReport: any) {
    if (!this.openai) {
      // Use local rule-based fallback if OpenAI API key is missing
      return this.generateRuleBasedAdvice(expenseReport, budgetReport);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial coach for HMall. Offer direct, supportive, and action-oriented financial advice.',
          },
          {
            role: 'user',
            content: `Please analyze my financial status:
Expense Report: ${JSON.stringify(expenseReport)}
Budget Forecast: ${JSON.stringify(budgetReport)}`,
          },
        ],
      });

      return response.choices[0].message?.content || 'Unable to generate advice.';
    } catch (error) {
      console.error('OpenAI Error, falling back to rule-based analysis:', error);
      return this.generateRuleBasedAdvice(expenseReport, budgetReport);
    }
  }

  private generateRuleBasedAdvice(expense: any, budget: any): string {
    let advice = `### HMall Rule-Based AI Coach Advice\n\n`;
    advice += `Based on your recent transactions, your total spending is **${expense.totalSpend || 0} Credits**.\n\n`;

    if (budget.status === 'At Risk') {
      advice += `⚠️ **Urgent Alert**: Your monthly budget is **At Risk** of being exceeded in **${budget.daysRemaining} days**.\n`;
      advice += `- Try limiting non-essential shopping to increase your safety margin.\n`;
    } else if (budget.status === 'UNKNOWN') {
      advice += `📝 **Tip**: You don't have an active budget period set. Set up a monthly category budget in the Expense page to get dynamic forecasting alerts.\n`;
    } else {
      advice += `✅ **Great Job!**: Your spending habits are aligned with your budget. You are on track to meet your targets this month.\n`;
    }

    if (expense.distribution && expense.distribution.length > 0 && expense.distribution[0].amount > 0) {
      const sorted = [...expense.distribution].sort((a, b) => b.amount - a.amount);
      const topCat = sorted[0];
      advice += `\n🔍 **Spending Profile**: Your highest expense category is **${topCat.category}** making up **${topCat.percentage}%** of your total spending. Consider cutting down back on this category.`;
    }

    return advice;
  }
}
