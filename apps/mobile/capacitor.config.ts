import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android shell for the Rihal operations console.
 *
 * Two supported modes:
 *  - Remote (recommended): set RIHAL_SERVER_URL=https://your-console.example
 *    before `pnpm android:debug`. The WebView opens the real console origin, so
 *    the refresh cookie stays first-party and no CORS is needed.
 *  - Bundled: leave RIHAL_SERVER_URL empty. The APK ships the console assets and
 *    asks the operator for the server address on first launch (stored on device).
 */
const serverUrl = process.env.RIHAL_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'sa.rihal.console',
  appName: 'رحّال',
  webDir: 'www',
  backgroundColor: '#0b3d26',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          androidScheme: 'https',
          cleartext: false,
          // Keep the operator inside the console (login, console views, status page).
          allowNavigation: [new URL(serverUrl).host],
        },
      }
    : {}),
};

export default config;
