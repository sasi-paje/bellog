import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'atomic-component-library', replacement: path.resolve(__dirname, '../atomic-component-library/src') }
    ]
  },
  assetsInclude: ['**/*.svg'],
})
