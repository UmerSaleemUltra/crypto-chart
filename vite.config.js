import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';  // Import path module

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // Alias '@' to 'src' directory
      '~': path.resolve(__dirname, './../'), // Alias '~' to the parent directory

    },
  },
});
