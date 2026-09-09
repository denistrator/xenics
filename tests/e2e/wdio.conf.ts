import { join } from 'node:path'

const binaryName = process.platform === 'win32' ? 'xenics.exe' : 'xenics'

export const config = {
  runner: 'local',
  specs: ['./*.e2e.ts'],
  maxInstances: 1,
  framework: 'mocha',
  reporters: ['spec'],
  services: ['@wdio/tauri-service'],
  capabilities: [
    {
      browserName: 'tauri',
      'tauri:options': {
        application:
          process.env.XENICS_APP_PATH ?? join(process.cwd(), 'src-tauri/target/debug', binaryName),
      },
    },
  ],
  mochaOpts: {
    timeout: 120_000,
  },
}
