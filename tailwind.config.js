// Build styles.css (Tailwind 3.4.17, same version the Play CDN served):
// npx tailwindcss@3.4.17 -c tailwind.config.js -i src/tailwind.css -o styles.css --minify
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f172a',
          surface: '#ffffff',
          subtle: '#f8fafc',
          border: '#e2e8f0',
          muted: '#64748b',
          accent: '#2563eb'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px'
      }
    }
  }
};
