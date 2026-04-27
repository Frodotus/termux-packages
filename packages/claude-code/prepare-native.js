#!/usr/bin/env node
'use strict';

const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PREFIX = process.env.PREFIX || '/data/data/com.termux/files/usr';
const LIB_DIR = path.join(PREFIX, 'lib', 'claude-code');
const config = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'audited-versions.json'), 'utf8'));

const version = process.argv[2] || config.default_version;
const versionInfo = config.versions[version];

if (!versionInfo) {
    console.error(`Unsupported version: ${version}`);
    process.exit(1);
}

const cacheDir = process.env.CLAUDE_CACHE || path.join(os.homedir(), '.cache', 'claude-code');
const versionDir = path.join(cacheDir, 'versions', version);
const sourceBin = path.join(versionDir, 'claude');

if (fs.existsSync(sourceBin)) {
    validateOffsets(sourceBin, versionInfo);
    console.log(`Claude Code ${version} already prepared.`);
    process.exit(0);
}

fs.mkdirSync(versionDir, { recursive: true });
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `claude-code-${version}-`));

try {
    console.log(`Downloading Claude Code ${version} native binary...`);
    run('npm', ['pack', versionInfo.native_spec, '--pack-destination', tmpDir]);

    const tgz = fs.readdirSync(tmpDir).find(f => f.endsWith('.tgz'));
    if (!tgz) throw new Error('npm pack produced no .tgz');

    const extractDir = path.join(tmpDir, 'pkg');
    fs.mkdirSync(extractDir);
    run('tar', ['-xzf', path.join(tmpDir, tgz), '-C', extractDir]);

    const pkgBin = path.join(extractDir, 'package', 'claude');
    fs.copyFileSync(pkgBin, sourceBin);
    fs.chmodSync(sourceBin, 0o755);

    validateOffsets(sourceBin, versionInfo);
    console.log(`Claude Code ${version} ready.`);
} finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
}

function run(cmd, args) {
    const r = cp.spawnSync(cmd, args, { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
}

function validateOffsets(file, info) {
    const buf = fs.readFileSync(file);
    const start = Number(info.entry_js_offset);
    const end = Number(info.entry_end_offset);

    const START_MARKER = Buffer.from('function(exports, require, module, __filename, __dirname) {// Claude Code is a Beta product');
    const END_MARKER = Buffer.from('/$bunfs/root/image-processor.js');

    if (!(start > 0 && end > start && end <= buf.length))
        throw new Error(`Invalid offsets for ${version}`);
    if (!buf.subarray(start, start + START_MARKER.length).equals(START_MARKER))
        throw new Error(`Start offset validation failed for ${version}`);
    if (!buf.subarray(end, end + END_MARKER.length).equals(END_MARKER))
        throw new Error(`End offset validation failed for ${version}`);
}
