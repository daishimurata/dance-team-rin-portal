import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5174,
    strictPort: false,
    host: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        schedule: resolve(__dirname, 'schedule.html'),
        support: resolve(__dirname, 'support.html'),
        mobile_schedule: resolve(__dirname, 'pdf_template_mobile.html'),
        a4_schedule: resolve(__dirname, 'pdf_template_a4.html'),
        suzuka_schedule: resolve(__dirname, 'suzuka_schedule.html'),
        baggage_duty: resolve(__dirname, 'baggage_duty.html')
      }
    }
  }
});
