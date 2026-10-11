import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { validatePublicEnvironment } from './deployment-guard.mjs'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {name:'montai-public-env-guard',configResolved(config){ validatePublicEnvironment(config.env,process.env); }}],
})
