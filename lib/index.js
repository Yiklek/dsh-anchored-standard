import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { cp, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const PRESETS = [
  { id: 'anchored-standard', source: 'preset' },
  { id: 'zero-anchored-standard', source: 'zero-anchored-standard' },
  { id: 'whoami-standard', source: 'whoami-standard' },
  { id: 'eternal-minimal', source: 'eternal-minimal' },
  { id: 'wire-think-standard', source: 'wire-think-standard' },
  { id: 'combo-anchored', source: 'combo-anchored' },
  { id: 'prefab', source: 'prefab' },
  { id: 'anchored-ptc', source: 'anchored-ptc' },
]

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function targetRoot() {
  return join(dshHome(), '.agent-presets')
}

async function readPresetMeta(sourceDir) {
  try {
    const text = await readFile(join(sourceDir, 'preset.yml'), 'utf8')
    const name = /^name:\s*(.+)$/m.exec(text)?.[1]?.trim().replace(/^['"]|['"]$/g, '')
    const description = /^description:\s*(.+)$/m.exec(text)?.[1]?.trim().replace(/^['"]|['"]$/g, '')
    return {
      name: name || undefined,
      description: description || undefined,
    }
  } catch {
    return {}
  }
}

async function listPresetDirs() {
  const entries = await readdir(PACKAGE_ROOT, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory() && existsSync(join(PACKAGE_ROOT, entry.name, 'agent.cordis.yml')))
    .map((entry) => entry.name)
}

function markRemote(ctor, method) {
  Remote(method)(ctor.prototype[method], {
    name: method,
    private: false,
    static: false,
    addInitializer: (fn) => { fn.call(Object.create(ctor.prototype)) },
  })
}

class AnchoredPresetInstaller extends TypertRemoteService {
  static inject = []

  constructor(ctx) {
    super(ctx, 'anchoredPresets')
  }

  async list() {
    const root = targetRoot()
    const rows = []
    const available = await listPresetDirs()
    for (const preset of PRESETS) {
      if (!available.includes(preset.source)) continue
      const sourceDir = join(PACKAGE_ROOT, preset.source)
      const targetDir = join(root, preset.id)
      const meta = await readPresetMeta(sourceDir)
      rows.push({
        id: preset.id,
        source: preset.source,
        name: meta.name || preset.id,
        description: meta.description || '',
        installed: existsSync(targetDir),
      })
    }
    return { rows }
  }

  async apply(ids) {
    if (!Array.isArray(ids)) {
      throw new Error('anchored-presets: "ids" must be an array')
    }
    const root = targetRoot()
    const requested = new Set(ids)
    const results = []
    for (const preset of PRESETS) {
      const sourceDir = join(PACKAGE_ROOT, preset.source)
      const targetDir = join(root, preset.id)
      const installed = existsSync(targetDir)
      if (requested.has(preset.id) && !installed) {
        try {
          await mkdir(root, { recursive: true })
          await cp(sourceDir, targetDir, { recursive: true })
          results.push({ id: preset.id, ok: true, action: 'installed' })
        } catch (error) {
          results.push({ id: preset.id, ok: false, action: 'install-failed', error: error instanceof Error ? error.message : String(error) })
        }
      } else if (!requested.has(preset.id) && installed) {
        try {
          await rm(targetDir, { recursive: true, force: true })
          results.push({ id: preset.id, ok: true, action: 'uninstalled' })
        } catch (error) {
          results.push({ id: preset.id, ok: false, action: 'uninstall-failed', error: error instanceof Error ? error.message : String(error) })
        }
      } else {
        results.push({ id: preset.id, ok: true, action: 'unchanged' })
      }
    }
    return { results }
  }
}

markRemote(AnchoredPresetInstaller, 'list')
markRemote(AnchoredPresetInstaller, 'apply')

export { AnchoredPresetInstaller }
export default AnchoredPresetInstaller
