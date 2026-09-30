import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * R1 Security Gate — static production-config invariants.
 * These tests fail the build if a security regression is reintroduced.
 * Evidence basis: MASTER_ROADMAP.md R1 / OWASP MASVS storage & config checks.
 */

const repoRoot = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(repoRoot, p), 'utf-8');

describe('security gate: android manifest & network config', () => {
  it('manifest disallows cleartext via network security config reference', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain('android:networkSecurityConfig="@xml/network_security_config"');
  });

  it('manifest excludes sensitive data from backups (cloud + device transfer)', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toContain('android:fullBackupContent="@xml/secure_store_backup_rules"');
    expect(manifest).toContain('android:dataExtractionRules="@xml/secure_store_data_extraction_rules"');
  });

  it('backup rules exclude SecureStore prefs and vault DB', () => {
    const backup = read('android/app/src/main/res/xml/secure_store_backup_rules.xml');
    expect(backup).toContain('path="SecureStore"');
    expect(backup).toContain('path="itrip-vault.db"');
    const extraction = read('android/app/src/main/res/xml/secure_store_data_extraction_rules.xml');
    expect(extraction).toContain('path="SecureStore"');
    expect(extraction).toContain('path="itrip-vault.db"');
  });

  it('network security config forbids cleartext globally', () => {
    const nsc = read('android/app/src/main/res/xml/network_security_config.xml');
    expect(nsc).toContain('cleartextTrafficPermitted="false"');
  });

  it('network security config has NO placeholder hosts (P0: zero example.com)', () => {
    const nsc = read('android/app/src/main/res/xml/network_security_config.xml');
    expect(nsc).not.toContain('example.com');
  });

  it('network security config pins production domains with expiration', () => {
    const nsc = read('android/app/src/main/res/xml/network_security_config.xml');
    expect(nsc).toContain('itrip-platform.vercel.app');
    expect(nsc).toContain('api.itrip.ir');
    expect(nsc).toMatch(/<pin-set expiration="\d{4}-\d{2}-\d{2}">/);
    const pinCount = (nsc.match(/<pin digest="SHA-256">/g) ?? []).length;
    expect(pinCount).toBeGreaterThanOrEqual(3); // primary + backups for rotation
  });
});

describe('security gate: release signing separation', () => {
  it('release buildType uses signingConfigs.release, never debug', () => {
    const gradle = read('android/app/build.gradle');
    // Extract the buildTypes block first, then the release block inside it.
    // (The debug buildType legitimately uses the debug keystore; only the
    // release buildType is guarded here.)
    const buildTypesStart = gradle.indexOf('buildTypes {');
    const gradleAfter = gradle.slice(buildTypesStart);
    const releaseStart = gradleAfter.indexOf('release {');
    const releaseEnd = gradleAfter.indexOf('} }', releaseStart) !== -1
      ? gradleAfter.indexOf('\n    }', releaseStart)
      : gradleAfter.length;
    const releaseBlock = gradleAfter.slice(releaseStart, releaseEnd);
    expect(releaseBlock).toContain('signingConfig signingConfigs.release');
    expect(releaseBlock).not.toContain('signingConfigs.debug');
  });

  it('release signing resolves from env vars or gradle.properties (fail-closed)', () => {
    const gradle = read('android/app/build.gradle');
    expect(gradle).toContain('ITRIP_RELEASE_KEYSTORE_PATH');
    expect(gradle).toContain('MYAPP_UPLOAD_STORE_FILE');
  });

  it('release keystore is gitignored', () => {
    const gitignore = read('.gitignore');
    expect(gitignore).toContain('android/app/release.keystore');
  });
});

describe('security gate: secret & debug-artifact scan (src/)', () => {
  function collectTsFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry === '__tests__' || entry === 'test') continue;
        collectTsFiles(full, acc);
      } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts')) {
        acc.push(full);
      }
    }
    return acc;
  }

  it('no hard-coded demo phone numbers in production source', () => {
    const offenders: string[] = [];
    for (const file of collectTsFiles(join(repoRoot, 'src'))) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('09120000000')) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('no hard-coded long credential-like literals in production source', () => {
    const offenders: string[] = [];
    const pattern = /(?:password|secret|apikey|api_key)\s*[:=]\s*['"][A-Za-z0-9+/]{20,}['"]/i;
    for (const file of collectTsFiles(join(repoRoot, 'src'))) {
      const content = readFileSync(file, 'utf-8');
      if (pattern.test(content)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('no console.log debug statements in production source', () => {
    const offenders: string[] = [];
    for (const file of collectTsFiles(join(repoRoot, 'src'))) {
      const content = readFileSync(file, 'utf-8');
      if (/console\.log\(/.test(content)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe('security gate: version consistency (release integrity)', () => {
  it('package.json, app.json and build.gradle report the same version', () => {
    const pkg = JSON.parse(read('package.json'));
    const appJson = JSON.parse(read('app.json'));
    const gradle = read('android/app/build.gradle');

    expect(appJson.expo.version).toBe(pkg.version);
    expect(gradle).toContain(`versionName "${pkg.version}"`);
    expect(gradle).toContain(`versionCode ${appJson.expo.android.versionCode}`);
  });
});
