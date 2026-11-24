import { mkdtemp, rm, appendFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { createPool, migrate } from '../server/db.js'

/** An isolated, socket-only database; never reads the app's DATABASE_URL. */
export async function testDatabase(seed = false) {
  const bindir =
    process.env.PG_BINDIR || execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim()
  const root = await mkdtemp('/tmp/weddingwallet-test-')
  const data = join(root, 'data')
  let started = false
  const run = (command: string, args: string[]) =>
    execFileSync(join(bindir, command), args, { stdio: 'pipe' })
  const pool = createPool(`postgresql:///postgres?host=${encodeURIComponent(root)}`)
  async function close() {
    await pool.end()
    if (started) run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'])
    await rm(root, { recursive: true, force: true })
  }
  try {
    run('initdb', ['-D', data, '--auth=trust', '--no-locale', '--encoding=UTF8'])
    await appendFile(
      join(data, 'postgresql.conf'),
      `\nlisten_addresses = ''\nunix_socket_directories = '${root}'\nfsync = off\n`
    )
    run('pg_ctl', ['-D', data, '-l', join(root, 'postgres.log'), '-w', 'start'])
    started = true
    await migrate(pool, { seed })
    return { pool, close }
  } catch (error) {
    await close()
    throw error
  }
}
