import fs from 'fs';
import path from 'path';

const routesDir = 'd:/da/HMall/backend/src/routes';
const files = fs.readdirSync(routesDir);

const routesMap = {
  'auth.routes.ts': '/api/auth',
  'user.routes.ts': '/api/users',
  'product.routes.ts': '/api/products',
  'task.routes.ts': '/api/tasks',
  'stock.routes.ts': '/api/stocks',
  'recommendation.routes.ts': '/api/recommendations',
  'admin.routes.ts': '/api/admin',
  'vendor.routes.ts': '/api/vendor',
  'game.routes.ts': '/api/games',
  'game-template.routes.ts': '/api/admin/game-templates',
  'game-instance.routes.ts': '/api/admin/game-instances',
  'game-content.routes.ts': '/api/admin/game-content',
  'transaction-label.routes.ts': '/api/transactions',
  'shopping-cart.routes.ts': '/api/cart',
  'purchase-history.routes.ts': '/api/purchase-history',
  'ai-suggestions.routes.ts': '/api/suggestions',
  'upload.routes.ts': '/api/upload',
  'notification.routes.ts': '/api/notifications',
  'voucher.routes.ts': '/api/vouchers',
  'vendor-public.routes.ts': '/api/vendors',
  'budget.routes.ts': '/api/budgets',
  'chat.routes.ts': '/api/chat',
  'social.routes.ts': '/api/social',
  'messaging.routes.ts': '/api/messaging',
  'blockchain.routes.ts': '/api/blockchain',
  'blockchain-audit.routes.ts': '/api/admin/blockchain-audit'
};

const swaggerPaths = {};

files.forEach(file => {
  if (!file.endsWith('.routes.ts')) return;
  
  const basePath = routesMap[file] || `/api/${file.split('.')[0]}`;
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  
  const regex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const method = match[1];
    let routePath = match[2];
    
    // Clean up route path (replace :id with {id})
    routePath = routePath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
    
    // Combine base path and route path
    const fullPath = (basePath + (routePath === '/' ? '' : routePath)).replace(/\/$/, '');
    
    if (!swaggerPaths[fullPath]) {
      swaggerPaths[fullPath] = {};
    }
    
    swaggerPaths[fullPath][method] = {
      tags: [file.split('.')[0].replace('-', ' ').toUpperCase()],
      summary: `${method.toUpperCase()} ${fullPath}`,
      responses: {
        '200': { description: 'OK' }
      }
    };
  }
});

fs.writeFileSync('d:/da/HMall/backend/scratch/all_routes.json', JSON.stringify(swaggerPaths, null, 2), 'utf8');
console.log('Successfully wrote routes to all_routes.json');
