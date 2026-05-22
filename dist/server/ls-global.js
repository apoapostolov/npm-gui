// Added to npm-gui by Hermes — scans both npm prefixes and merges results.
// This is the canonical source for global package listing on this machine.
// Handles `outdated` (and `outdated-pkg`) by merging results from both prefixes
// because `npm outdated` exits non-zero when updates exist (so we capture stdout on throw)
// and NVM vs custom-global packages live in different prefixes.
const { execSync, execFileSync } = require('child_process');
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');
const NPMG = '/home/apoapostolov/.npm-global';
const NVMN = '/home/apoapostolov/.nvm/versions/node/v24.15.0';
const CACHE_DIR = '/home/apoapostolov/.cache';
const VERSION_CACHE_FILE = join(CACHE_DIR, 'npm-gui-version-cache.json');
const OUTDATED_CACHE_FILE = join(CACHE_DIR, 'npm-gui-outdated-cache.json');
const OUTDATED_TTL_MS = 5 * 60 * 1000;
const versionCache = new Map();
let versionCacheDirty = false;
let outdatedCache = { ts: 0, data: null };

try {
  if (existsSync(VERSION_CACHE_FILE)) {
    const cached = JSON.parse(readFileSync(VERSION_CACHE_FILE, 'utf8'));
    for (const [k, v] of Object.entries(cached || {})) {
      if (typeof v === 'string' && v) versionCache.set(k, v);
    }
  }
} catch {
  // Ignore cache load failures. Worst case we repopulate from npm.
}

try {
  if (existsSync(OUTDATED_CACHE_FILE)) {
    const cached = JSON.parse(readFileSync(OUTDATED_CACHE_FILE, 'utf8'));
    if (cached && typeof cached.ts === 'number' && cached.data) outdatedCache = cached;
  }
} catch {
  // Ignore cache load failures. Worst case we recompute outdated data.
}

function ensureCacheDir() {
  mkdirSync(CACHE_DIR, { recursive: true });
}

function flushVersionCache() {
  if (!versionCacheDirty) return;
  try {
    ensureCacheDir();
    writeFileSync(VERSION_CACHE_FILE, JSON.stringify(Object.fromEntries(versionCache)));
    versionCacheDirty = false;
  } catch {
    // Ignore cache write failures. Endpoint correctness matters more than caching.
  }
}

function flushOutdatedCache(data) {
  try {
    ensureCacheDir();
    const payload = { ts: Date.now(), data };
    writeFileSync(OUTDATED_CACHE_FILE, JSON.stringify(payload));
    outdatedCache = payload;
  } catch {
    // Ignore cache write failures. Endpoint correctness matters more than caching.
  }
}

process.on('exit', () => {
  flushVersionCache();
});

function run(prefix) {
  try {
    const out = execSync(
      `npm ls --prefix ${prefix} -g --depth=0 --json --long 2>/dev/null`,
      { encoding: 'utf8', timeout: 15000 }
    );
    return JSON.parse(out || '{}');
  } catch (err) {
    let out = '';
    if (err && typeof err.stdout === 'string') out = err.stdout;
    else if (typeof err === 'string') out = err;
    try {
      if (out && out.trim()) return JSON.parse(out);
    } catch {}
    return { dependencies: {} };
  }
}

function pkgVersion(dep) {
  if (dep && typeof dep === 'object' && dep.version) return dep.version;
  if (!dep || typeof dep !== 'object') return null;

  if (dep.path) {
    try {
      const manifest = JSON.parse(readFileSync(join(dep.path, 'package.json'), 'utf8'));
      if (manifest && manifest.version) return manifest.version;
    } catch {
      // fall through to registry lookup
    }
  }

  const name = dep.name;
  if (!name) return null;
  if (versionCache.has(name)) return versionCache.get(name);

  try {
    const out = execFileSync('npm', ['view', name, 'version', '--json'], {
      encoding: 'utf8',
      timeout: 8000,
    });
    const parsed = JSON.parse(out);
    const version = Array.isArray(parsed) ? parsed[0] : parsed;
    if (typeof version === 'string' && version) {
      versionCache.set(name, version);
      versionCacheDirty = true;
      return version;
    }
  } catch {
    // Network/registry failure. Leave uncached so a later run can retry.
  }

  return null;
}

function enrich(deps = {}) {
  const out = {};
  for (const [name, dep] of Object.entries(deps)) {
    out[name] = dep && typeof dep === 'object'
      ? { ...dep, ...(dep.version ? {} : { version: pkgVersion(dep) }) }
      : dep;
  }
  return out;
}

function merge(a, b) {
  return { dependencies: { ...enrich(a.dependencies), ...enrich(b.dependencies) } };
}

function getOutdated(force = false) {
  if (!force && outdatedCache && typeof outdatedCache.ts === 'number' && outdatedCache.data && Date.now() - outdatedCache.ts < OUTDATED_TTL_MS) {
    return outdatedCache.data;
  }
  try {
    const getOut = (prefix) => {
      try {
        const out = execSync(
          `npm outdated --prefix ${prefix} -g --json 2>/dev/null`,
          { encoding: 'utf8', timeout: 15000 }
        );
        return out || '';
      } catch (err) {
        if (err && typeof err.stdout === 'string') return err.stdout;
        if (typeof err === 'string') return err;
        return '';
      }
    };
    const out1 = getOut(NPMG);
    const out2 = getOut(NVMN);
    let o1 = {};
    let o2 = {};
    try { if (out1) o1 = JSON.parse(out1); } catch {}
    try { if (out2) o2 = JSON.parse(out2); } catch {}
    const merged = { ...o1, ...o2 };
    // Self-protection: never let the registry tell us we need to "downgrade" or update our own 4.1.0 fork
    delete merged['npm-gui'];
    flushOutdatedCache(merged);
    return merged;
  } catch {
    return {};
  }
}

function findPrefixForPackage(name) {
  if (name === 'npm-gui') {
    // Self-protection: never let the registry decide our version or suggest "updates" to official 4.0.x
    return NPMG;
  }
  try {
    const a = run(NPMG);
    if (a && a.dependencies && a.dependencies[name]) return NPMG;
    const b = run(NVMN);
    if (b && b.dependencies && b.dependencies[name]) return NVMN;
  } catch {}
  return NPMG; // default for new global packages
}

const mode = process.argv[2];
const pkg = process.argv[3];

if (mode === 'ls') {
  console.log(JSON.stringify(merge(run(NPMG), run(NVMN))));
} else if (mode === 'outdated') {
  console.log(JSON.stringify(getOutdated()));
} else if (mode === 'ls-pkg' && pkg) {
  const a = run(NPMG), b = run(NVMN);
  const merged = { ...enrich(a.dependencies), ...enrich(b.dependencies) };
  console.log(JSON.stringify({ dependencies: { [pkg]: merged[pkg] || null } }));
} else if (mode === 'outdated-pkg' && pkg) {
  if (pkg === 'npm-gui') {
    console.log('{}'); // never report updates for ourselves
  } else {
    const o = getOutdated(true);
    if (o[pkg]) console.log(JSON.stringify({ [pkg]: o[pkg] }));
    else console.log('{}');
  }
} else if (mode === 'clear-outdated' || mode === 'refresh-outdated') {
  try {
    const { unlinkSync, existsSync } = require('fs');
    if (existsSync(OUTDATED_CACHE_FILE)) unlinkSync(OUTDATED_CACHE_FILE);
    outdatedCache = { ts: 0, data: null };
  } catch {}
  console.log('{}');
} else if (mode === 'install-pkg') {
  const name = process.argv[3];
  const ver = process.argv[4] || 'latest';
  if (!name) {
    console.log('{}');
  } else if (name === 'npm-gui') {
    // Self-protection: never attempt to "update" our own patched 4.1.0 fork from the public registry
    console.log(JSON.stringify({ ok: true, self: true, protected: true }));
  } else {
    const prefix = findPrefixForPackage(name);
    try {
      const cmd = `npm install ${name}@${ver} --prefix ${prefix} -g --json 2>/dev/null`;
      execSync(cmd, { encoding: 'utf8', timeout: 180000 });
    } catch (err) {
      // npm install -g often exits non-zero even on partial success or warnings.
      // We still want to let the caller re-query ls/outdated so the UI can reflect reality.
    }
    console.log(JSON.stringify({ ok: true, prefix }));
  }
}
