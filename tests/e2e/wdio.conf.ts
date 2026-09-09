import { join } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

let viteProcess: ChildProcess | undefined

async function waitForDevServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await fetch('http://127.0.0.1:1420')
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  throw new Error('Vite dev server did not become ready on port 1420')
}

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
  onPrepare: async () => {
    viteProcess = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], {
      cwd: process.cwd(),
      stdio: 'ignore',
    })
    await waitForDevServer()
  },
  onComplete: () => {
    viteProcess?.kill()
  },
}
