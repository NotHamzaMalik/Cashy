import { type Store, type Transaction } from './finance';
const tx = (id: string, merchant: string, amount: number, date: string, category: string, accountId = 'bank', type: Transaction['type'] = 'expense', currency: 'PKR' | 'USD' = 'PKR'): Transaction => ({ id, merchant, amount: amount * 100, date: `2026-10-${date}`, category, accountId, type, currency, owner: 'me', note: '' });
export function initialStore(): Store {
  return {
    version: 1,
    accounts: [
      { id: 'bank', owner: 'me', name: 'Everyday account', kind: 'Bank account', currency: 'PKR', opening: 14250000, color: 'peach' },
      { id: 'cash', owner: 'me', name: 'Cash wallet', kind: 'Cash', currency: 'PKR', opening: 1800000, color: 'green' },
      { id: 'usd', owner: 'me', name: 'Dollar savings', kind: 'Savings', currency: 'USD', opening: 125000, color: 'lavender' },
      { id: 'child-cash', owner: 'child', name: 'Ayaan’s wallet', kind: 'Cash', currency: 'PKR', opening: 1500000, color: 'yellow' }
    ],
    transactions: [
      tx('t1', 'October salary', 185000, '01', 'Salary', 'bank', 'income'),
      tx('t2', 'Apartment rent', 42000, '02', 'Bills & utilities'),
      tx('t3', 'Al-Fatah', 6450, '03', 'Groceries'),
      tx('t4', 'Careem', 680, '04', 'Transport', 'cash'),
      tx('t5', 'Freelance project', 45000, '05', 'Freelance', 'bank', 'income'),
      tx('t6', 'Electricity bill', 8350, '06', 'Bills & utilities'),
      tx('t7', 'Coffee & company', 1250, '07', 'Food & drinks', 'cash'),
      tx('t8', 'Daraz', 3499, '08', 'Shopping'),
      tx('t9', 'Weekly groceries', 5800, '09', 'Groceries'),
      tx('t10', 'Fuel stop', 4500, '10', 'Transport'),
      tx('t11', 'Family dinner', 3850, '11', 'Food & drinks'),
      tx('t12', 'Spotify', 349, '12', 'Entertainment'),
      tx('t13', 'Morning coffee', 650, '13', 'Food & drinks', 'cash'),
      tx('t14', 'Notion', 10, '10', 'Bills & utilities', 'usd', 'expense', 'USD'),
      { ...tx('c1', 'School supplies', 1850, '10', 'Education', 'child-cash'), owner: 'child', reportStatus: 'submitted' },
      { ...tx('c2', 'Lunch with friends', 750, '12', 'Food & drinks', 'child-cash'), owner: 'child', reportStatus: 'submitted' },
      { ...tx('c3', 'Bus fare', 300, '13', 'Transport', 'child-cash'), owner: 'child', reportStatus: 'draft' }
    ],
    budgets: [
      { id: 'b1', category: 'Food & drinks', limit: 1800000, currency: 'PKR' },
      { id: 'b2', category: 'Groceries', limit: 2000000, currency: 'PKR' },
      { id: 'b3', category: 'Transport', limit: 1000000, currency: 'PKR' },
      { id: 'b4', category: 'Shopping', limit: 400000, currency: 'PKR' }
    ],
    goals: [
      { id: 'g1', name: 'Emergency fund', target: 50000000, saved: 18000000, currency: 'PKR', deadline: '2027-06-30', icon: 'shield' },
      { id: 'g2', name: 'Northern escape', target: 12000000, saved: 6500000, currency: 'PKR', deadline: '2027-03-01', icon: 'mountain' }
    ],
    holdings: [
      { id: 'h1', name: 'Index fund', kind: 'Mutual fund', cost: 20000000, value: 22350000, currency: 'PKR', asOf: '2026-10-12' },
      { id: 'h2', name: 'Gold savings', kind: 'Gold', cost: 8500000, value: 9100000, currency: 'PKR', asOf: '2026-10-12' }
    ],
    subscriptions: [
      { id: 's1', name: 'Netflix', amount: 110000, currency: 'PKR', due: '2026-10-18', cadence: 'monthly', accountId: 'bank' },
      { id: 's2', name: 'Spotify', amount: 34900, currency: 'PKR', due: '2026-11-12', cadence: 'monthly', accountId: 'bank' },
      { id: 's3', name: 'Notion', amount: 1000, currency: 'USD', due: '2026-11-10', cadence: 'monthly', accountId: 'usd' }
    ]
  };
}
