/**
 * Setup script for HMall project
 * Handles installation with better error handling and retry logic
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function installDependencies(dir, name) {
  log(`\n📦 Installing dependencies for ${name}...`, 'blue');
  
  try {
    execSync('npm install', {
      cwd: dir,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_registry: process.env.npm_config_registry || 'https://registry.npmjs.org/',
      },
    });
    log(`✅ ${name} dependencies installed successfully!`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to install ${name} dependencies`, 'red');
    log(`   Error: ${error.message}`, 'yellow');
    return false;
  }
}

function main() {
  log('🚀 Starting HMall project setup...', 'blue');
  log('=====================================\n', 'blue');

  const rootDir = path.resolve(__dirname, '..');
  const backendDir = path.join(rootDir, 'backend');
  const frontendDir = path.join(rootDir, 'frontend');
  const aiServiceDir = path.join(rootDir, 'ai-service');

  // Check if directories exist
  const dirs = [
    { path: backendDir, name: 'backend' },
    { path: frontendDir, name: 'frontend' },
    { path: aiServiceDir, name: 'ai-service' },
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir.path)) {
      log(`❌ Directory ${dir.name} not found!`, 'red');
      process.exit(1);
    }
  }

  const results = [];

  // Install root dependencies
  log('\n📦 Installing root dependencies...', 'blue');
  results.push({ name: 'root', success: installDependencies(rootDir, 'Root') });

  // Install backend dependencies
  results.push({ name: 'backend', success: installDependencies(backendDir, 'Backend') });

  // Install frontend dependencies
  results.push({ name: 'frontend', success: installDependencies(frontendDir, 'Frontend') });

  // Install AI service dependencies
  results.push({ name: 'ai-service', success: installDependencies(aiServiceDir, 'AI Service') });

  // Summary
  log('\n=====================================', 'blue');
  log('📊 Setup Summary:', 'blue');
  log('=====================================\n', 'blue');

  const failed = results.filter(r => !r.success);
  const succeeded = results.filter(r => r.success);

  succeeded.forEach(r => {
    log(`✅ ${r.name}: Success`, 'green');
  });

  if (failed.length > 0) {
    log('\n❌ Failed installations:', 'red');
    failed.forEach(r => {
      log(`   - ${r.name}`, 'yellow');
    });
    
    log('\n💡 Troubleshooting tips:', 'yellow');
    log('   1. Check your internet connection', 'yellow');
    log('   2. Try running manually:', 'yellow');
    failed.forEach(r => {
      log(`      cd ${r.name} && npm install`, 'yellow');
    });
    log('   3. Clear npm cache: npm cache clean --force', 'yellow');
    log('   4. Try using a different registry:', 'yellow');
    log('      npm config set registry https://registry.npmjs.org/', 'yellow');
    log('   5. If behind a proxy, configure npm proxy settings', 'yellow');
    
    process.exit(1);
  } else {
    log('\n🎉 All dependencies installed successfully!', 'green');
    log('\n📝 Next steps:', 'blue');
    log('   1. Setup Supabase: cd supabase && supabase start', 'blue');
    log('   2. Configure .env files (see ENV_SETUP.md)', 'blue');
    log('   3. Run migrations: cd supabase && supabase db reset', 'blue');
    log('   4. Start development servers:', 'blue');
    log('      - Backend: npm run dev:backend', 'blue');
    log('      - AI Service: npm run dev:ai', 'blue');
    log('      - Frontend: npm run dev:frontend', 'blue');
  }
}

main();



