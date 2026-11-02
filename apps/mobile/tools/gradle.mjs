/** Cross-platform Gradle wrapper launcher.
 *
 * `./gradlew` is a POSIX shell script and `gradlew.bat` is a Windows batch file;
 * npm/pnpm scripts run in `cmd` on Windows and in `sh` elsewhere, so picking the
 * wrapper here keeps `pnpm android:apk` working on both.
 *
 * Usage: node tools/gradle.mjs assembleDebug ["--stacktrace", ...]
 */
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const androidDir = resolve(here, '..', 'android');
const isWindows = process.platform === 'win32';
const wrapper = join(androidDir, isWindows ? 'gradlew.bat' : 'gradlew');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node tools/gradle.mjs <task> [args...]');
  process.exit(1);
}

const child = spawn(isWindows ? wrapper : wrapper, args, {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWindows,
  env: {
    ...process.env,
    // Local builds are for testing; keep the console window free of Gradle noise.
    GRADLE_OPTS: process.env.GRADLE_OPTS ?? '-Dorg.gradle.jvmargs=-Xmx2g',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Gradle terminated by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
