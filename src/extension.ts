'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs'
import { spawn, exec, execFile } from 'child_process'

const kill = require('tree-kill');

const tscProcesses = {};
let watcher, outputChannel;

const configureOutputChannel = () => {
    outputChannel = vscode.window.createOutputChannel('TypeScript Compiler')
}

const disposeOutputChannel = () => {
    if (outputChannel)
        outputChannel.dispose();
}
let cleanupChannelOnNextRound = false;

const updateOutputChannel = (data) => {
    if (cleanupChannelOnNextRound) {
        outputChannel.clear();
        cleanupChannelOnNextRound = false;
    }
    var dataString = `${data}`;

    if (dataString.indexOf('error') > -1) {
        outputChannel.append(dataString);
    } else {
        cleanupChannelOnNextRound = true;
    }
}

const launchTSC = (tsconfigPath) => {

    const tsc = spawn('tsc', ['-p', `"${tsconfigPath}"`, '-w'], { shell: true });

    tsc.stdout.on('data', (data) => updateOutputChannel(`${data}`));

    tsc.on('close', (code, signal) => delete tscProcesses[tsc.pid]);

    tscProcesses[tsconfigPath] = tsc.pid;
}

const stopTSC = (tsconfigPath) => {
    if (tscProcesses[tsconfigPath]) {
        kill(tscProcesses[tsconfigPath]);
    }
}

const stopAllTSC = () => Object.keys(tscProcesses).forEach(key => stopTSC(key))

const processTsConfig = tsconfigPath => {
    stopTSC(tsconfigPath);
    try {
        const data = fs.readFileSync(tsconfigPath, 'utf8');
        const tsconfig = JSON.parse(data);
        if (tsconfig.compileOnSave === true) {
            launchTSC(tsconfigPath)
            return;
        }
    } catch (e) { }

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

    if (vscode.workspace.rootPath) {
        configureOutputChannel();
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
    stopAllTSC();
    disposeWatcher();
    disposeOutputChannel();
}