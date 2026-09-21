import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset URLs relative so the build works under
// https://<user>.github.io/<repo>/ regardless of the repository name.
export default defineConfig({
  plugins: [react()],
  base: './',
});
