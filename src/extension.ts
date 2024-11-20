'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { AmxModXDebugSession } from './smDebug';
import * as Net from 'net';

const EMBED_DEBUG_ADAPTER = true;

export function activate(context: vscode.ExtensionContext) {
    console.info("SourcePawn Debug Extension Activating...");
    console.info("Workspace root:", vscode.workspace.rootPath);
    console.info("Extension path:", context.extensionPath);

    const provider = new AmxModXDebugConfigurationProvider()
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('sourcepawn', provider));
    context.subscriptions.push(provider);

    console.info("Debug configuration provider registered successfully");
}

export function deactivate() {
    console.info("SourcePawn Debug Extension Deactivating...");
}

class AmxModXDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    private _server?: Net.Server;

    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        console.log("Resolving debug configuration...");
        console.log("Workspace folder:", folder?.uri.fsPath);
        console.log("Initial config:", config);

        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'sourcepawn') {
                console.log("Creating default debug configuration for SourcePawn file");
                config.type = 'sourcepawn';
                config.name = 'Launch';
                config.request = 'launch';
                config.program = 'test';
                config.stopOnEntry = true;
            }
        }

        if (EMBED_DEBUG_ADAPTER) {
            if (!this._server) {
                console.log("Starting debug server...");
                this._server = Net.createServer(socket => {
                    console.log("New debug connection established");
                    const session = new AmxModXDebugSession();
                    session.setRunAsServer(true);
                    session.start(<NodeJS.ReadableStream>socket, socket);
                }).listen(0);

                console.log("Debug server started on port:", (<Net.AddressInfo>this._server.address()).port);
            }

            config.debugServer = (<Net.AddressInfo>this._server.address()).port;
            console.log("Debug configuration resolved:", config);
        }

        return config;
    }

    dispose() {
        if (this._server) {
            console.log("Closing debug server");
            this._server.close();
            this._server = undefined;
        }
    }
}