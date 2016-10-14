'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs'
import { spawn, exec, execFile } from 'child_process'

const kill = require('tree-kill');
const stripJSONComments = require('strip-json-comments')
const tscProcesses = {};
let watcher, outputChannel;

console.log('loading extension');

const configureOutputChannel = () => {
    console.log('create output channel')
    if (!outputChannel)
        outputChannel = vscode.window.createOutputChannel('TypeScript Compiler')
}

const disposeOutputChannel = () => {
    console.log('dispose output channel');
    if (outputChannel) {
        outputChannel.dispose();
        outputChannel = null;
    }

}
let cleanupChannelOnNextRound = false;

const updateOutputChannel = (data) => {
    console.log('OUTPUT', data);
    if (cleanupChannelOnNextRound) {
        outputChannel.clear();
        outputChannel.hide();
        cleanupChannelOnNextRound = false;
    }
    var dataString = `${data}`;

    if (dataString.indexOf('error') > -1) {
        outputChannel.append(dataString);
        outputChannel.show(true);
    } else {
        cleanupChannelOnNextRound = true;
    }
}

const launchTSC = (tsconfigPath) => {
    console.log('launch tsc', tsconfigPath);
    const tsc = spawn('tsc', ['-p', `"${tsconfigPath}"`, '-w'], { shell: true });

    tsc.stdout.on('data', (data) => updateOutputChannel(`${data}`));

    tsc.on('close', (code, signal) => {
        delete tscProcesses[tsc.pid]
        console.log('close process');
        if (Object.keys(tscProcesses).length === 0) {
            disposeOutputChannel();
        }
    });

    tsc.on('error', (err) => console.error('tsc error:', err))

    tscProcesses[tsconfigPath] = tsc.pid;
}

const stopTSC = (tsconfigPath) => {
    console.log('stop tsc', tsconfigPath);
    if (tscProcesses[tsconfigPath]) {
        kill(tscProcesses[tsconfigPath]);
    }
}

const stopAllTSC = () => Object.keys(tscProcesses).forEach(key => stopTSC(key))

const processTsConfig = tsconfigPath => {
    console.log('process tsconfig', tsconfigPath);
    try {
        const data = fs.readFileSync(tsconfigPath, 'utf8');
        console.log('data', data);
        const tsconfig = JSON.parse(stripJSONComments(data));
        console.log('tsconfig:', tsconfig);
        if (tsconfig.compileOnSave === true) {
            if (!tscProcesses[tsconfigPath]) {
                launchTSC(tsconfigPath)
                configureOutputChannel();
            }
        } else {
            stopTSC(tsconfigPath)
        }
    } catch (e) {
        console.log('catch', e);
        stopTSC(tsconfigPath);
    }

}


const createWatcher = () => {

    watcher = vscode.workspace.createFileSystemWatcher('**/tsconfig.json')

    const processChange = ({fsPath}) => processTsConfig(fsPath)

    watcher.onDidChange(processChange);
    watcher.onDidCreate(processChange);
    watcher.onDidDelete(processChange);
}

const disposeWatcher = () => {
    if (watcher && watcher.dispose)
        watcher.dispose();
}

export function activate(context: vscode.ExtensionContext) {

    console.log('activate compileOnSave extension')
    if (vscode.workspace.rootPath) {
        vscode.workspace.findFiles('**/tsconfig.json', '**/node_modules/**').then((files) => {
            files.forEach(({fsPath}) => {
                processTsConfig(fsPath);
            })
        })
        createWatcher();

    } else {
        //'no root path: no need to activate the extension'
    }

}

export function deactivate() {
    console.log('dispose');
    stopAllTSC();
    disposeWatcher();
    disposeOutputChannel();
}