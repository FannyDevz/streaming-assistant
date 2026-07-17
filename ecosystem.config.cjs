// PM2 — jalankan server 24/7 tanpa Docker (auto-restart + startup on boot).
//
//   npm i -g pm2
//   cd dashboard && npm ci && npm run build   # build dashboard sekali
//   cd ../server && npm ci                     # dependensi server
//   pm2 start ecosystem.config.cjs             # dari root repo
//   pm2 save && pm2 startup                     # auto-start saat server reboot
//
module.exports = {
  apps: [
    {
      name: "streaming-assistant",
      cwd: "./server",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "4300",
        HOST: "0.0.0.0",
        // Set ADMIN_PASSWORD di server/.env (lebih aman daripada di sini).
      },
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
    },
  ],
};
