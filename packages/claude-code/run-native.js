#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const sourceBin = process.env.SOURCE_BIN;
const workdir = process.env.WORKDIR;
const entryJsOffset = Number(process.env.ENTRY_JS_OFFSET);
const entryEndOffset = Number(process.env.ENTRY_END_OFFSET);

if (!sourceBin || !workdir || !entryJsOffset || !entryEndOffset) {
    console.error('Missing required environment variables');
    process.exit(1);
}

class RequestedExit extends Error {
    constructor(code) {
        super(`exit ${code}`);
        this.code = code;
    }
}

function extractEntryJs() {
    const cacheFile = path.join(workdir, `cli.${entryJsOffset}.${entryEndOffset}.js`);
    if (fs.existsSync(cacheFile)) return cacheFile;

    const len = entryEndOffset - entryJsOffset;
    const fd = fs.openSync(sourceBin, 'r');
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, entryJsOffset);
    fs.closeSync(fd);

    fs.writeFileSync(cacheFile, buf.toString('utf8').replace(/[\0\s]+$/, ''));
    return cacheFile;
}

function makeRequire(realRequire) {
    const realChild = realRequire('child_process');

    function rewriteSpawnArgs(args) {
        // xdg-open → termux-open-url
        if (Array.isArray(args) && args[0] === 'xdg-open' && Array.isArray(args[1]) && args[1][0]) {
            return ['termux-open-url', [args[1][0]], ...args.slice(2)];
        }
        return args;
    }

    return function fakeRequire(id) {
        // Stub ws — Claude Code uses it for MCP, but native addon won't load
        if (id === 'ws') {
            class WS {
                on() { return this; }
                once() { return this; }
                addEventListener() { return this; }
                close() {}
                send() {}
                ping() {}
            }
            return { default: WS, WebSocket: WS };
        }

        // Patch child_process to redirect xdg-open calls
        if (id === 'child_process') {
            return {
                ...realChild,
                spawn: (...a) => realChild.spawn(...rewriteSpawnArgs(a)),
                spawnSync: (...a) => realChild.spawnSync(...rewriteSpawnArgs(a)),
            };
        }

        // Block internal Bun virtual fs requires
        if (id.startsWith('/$bunfs/root/')) {
            throw new Error(`bunfs require blocked: ${id}`);
        }

        return realRequire(id);
    };
}

async function main() {
    const entryFile = extractEntryJs();
    const code = fs.readFileSync(entryFile, 'utf8');
    // eslint-disable-next-line no-eval
    const fn = eval(`(${code}`);

    const origArgv = process.argv.slice();
    const origExit = process.exit;
    const origBunVersion = process.versions.bun;
    const hadBun = Object.prototype.hasOwnProperty.call(globalThis, 'Bun');
    const origBun = globalThis.Bun;
    const asyncErrors = [];

    const fakeReq = makeRequire(require);
    const onAsyncError = e => asyncErrors.push(e);

    try {
        process.once('uncaughtException', onAsyncError);
        process.once('unhandledRejection', onAsyncError);

        // Pretend to be Bun
        Object.defineProperty(process.versions, 'bun', { value: '1.1.8', configurable: true });
        globalThis.Bun = { version: '1.1.8' };

        process.argv = ['node', entryFile, ...process.argv.slice(2)];
        process.exit = code => { throw new RequestedExit(code); };

        const mod = { exports: {} };
        const result = fn(mod.exports, fakeReq, mod, entryFile, workdir);
        if (result && typeof result.then === 'function') await result;
        await new Promise(r => setTimeout(r, 200));
        if (asyncErrors.length) throw asyncErrors[0];
    } catch (e) {
        if (e instanceof RequestedExit) {
            process.exitCode = e.code;
            return;
        }
        throw e;
    } finally {
        process.removeListener('uncaughtException', onAsyncError);
        process.removeListener('unhandledRejection', onAsyncError);
        process.argv = origArgv;
        process.exit = origExit;
        try {
            if (origBunVersion === undefined) delete process.versions.bun;
            else Object.defineProperty(process.versions, 'bun', { value: origBunVersion, configurable: true });
        } catch {}
        if (hadBun) globalThis.Bun = origBun;
        else delete globalThis.Bun;
    }
}

main().catch(e => {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(1);
});
