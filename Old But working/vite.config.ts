import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Build directly into WordPress plugin directory
    outDir: 'wordpress/pulse2/build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Consistent naming for WordPress to reference
        entryFileNames: 'assets/index-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Generate manifest for WordPress to find the correct files
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs']
        }
      }
    },
    // Generate source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize for production
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    // Ensure compatibility with WordPress environment
    target: 'es2015',
    // Configure for library usage
    lib: undefined, // Keep as regular app build
  },
  define: {
    // Define globals for WordPress integration
    '__WORDPRESS_MODE__': JSON.stringify(true),
    // Environment variables
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  server: {
    // Development server settings for WordPress integration
    port: 3000,
    host: true,
    cors: true
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: true
  },
  // Skip TypeScript checking during build
  esbuild: {
    logLevel: 'error',
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
})
