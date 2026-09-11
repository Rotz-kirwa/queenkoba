#!/bin/bash

# Queen Koba Admin - Automated Setup Script
# This script creates all necessary files for the admin system

cd /home/user/Public/koba/admin

echo "🚀 Setting up Queen Koba Admin System..."

# Create directory structure
mkdir -p src/{components/{layout,dashboard,products,orders,customers,ui},pages,lib,context,hooks,types}

# Create vite.config.ts
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
  },
})
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Update package.json scripts
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="tsc && vite build"
npm pkg set scripts.preview="vite preview"

echo "✅ Admin system structure created!"
echo ""
echo "📝 Next steps:"
echo "1. Review COMPLETE_CODE.md for all component code"
echo "2. Copy components from the documentation"
echo "3. Run: npm run dev"
echo "4. Access: http://localhost:5174"
echo ""
echo "🔑 Default login: admin@queenkoba.com / admin123"
