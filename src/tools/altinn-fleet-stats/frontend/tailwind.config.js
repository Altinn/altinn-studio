/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Disable preflight: Designsystemet's @layer ds.base handles element reset.
  // Tailwind preflight would otherwise reset <button>, <input> etc.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
