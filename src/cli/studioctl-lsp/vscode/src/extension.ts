import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    RevealOutputChannelOn,
    ServerOptions,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    context.subscriptions.push(
        vscode.commands.registerCommand('altinnStudioLsp.restart', async () => {
            await stop();
            await start();
        }),
        // Target of the server's "N references" code lenses
        vscode.commands.registerCommand(
            'altinnAppConfig.showReferences',
            async (uri: string, position: LspPosition, locations: LspLocation[]) => {
                await vscode.commands.executeCommand(
                    'editor.action.showReferences',
                    vscode.Uri.parse(uri),
                    new vscode.Position(position.line, position.character),
                    locations.map(
                        (l) =>
                            new vscode.Location(
                                vscode.Uri.parse(l.uri),
                                new vscode.Range(
                                    l.range.start.line,
                                    l.range.start.character,
                                    l.range.end.line,
                                    l.range.end.character,
                                ),
                            ),
                    ),
                );
            },
        ),
    );
    await start();
}

interface LspPosition {
    line: number;
    character: number;
}

interface LspLocation {
    uri: string;
    range: { start: LspPosition; end: LspPosition };
}

export function deactivate(): Thenable<void> | undefined {
    return stop();
}

async function start(): Promise<void> {
    const config = vscode.workspace.getConfiguration('altinnStudioLsp');
    const command = config.get<string>('serverCommand', 'studioctl');
    const args = config.get<string[]>('serverArgs', ['app', 'lsp']);
    const logLevel = config.get<string>('logLevel', 'info');

    if (!(await canSpawn(command))) {
        const pick = await vscode.window.showErrorMessage(
            `Altinn Studio Language Server: '${command}' was not found. Install studioctl, or set ` +
                '"altinnStudioLsp.serverCommand" to its full path.',
            'Open settings',
            'Install studioctl',
        );
        if (pick === 'Open settings') {
            void vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'altinnStudioLsp.serverCommand',
            );
        } else if (pick === 'Install studioctl') {
            void vscode.env.openExternal(
                vscode.Uri.parse('https://docs.altinn.studio/en/altinn-studio/v8/reference/cli/install/'),
            );
        }
        return;
    }

    const serverOptions: ServerOptions = {
        command,
        args,
        options: { env: { ...process.env, STUDIOCTL_LSP_LOG: logLevel } },
    };

    const clientOptions: LanguageClientOptions = {
        // The server validates the whole app workspace and publishes diagnostics by
        // URI; we attach to the config file types so edits are forwarded as buffers.
        documentSelector: [
            { scheme: 'file', language: 'json' },
            { scheme: 'file', language: 'jsonc' },
            { scheme: 'file', language: 'xml' },
            { scheme: 'file', pattern: '**/*.bpmn' },
            // C# data-model classes, scoped to App/models so we don't attach to every C# file.
            // Enables find-references from a model property into the JSON bindings (alongside the
            // C# language server, whose results are merged); other .cs cursors contribute nothing.
            { scheme: 'file', pattern: '**/App/models/**/*.cs' },
        ],
        synchronize: {
            // Disk-level changes (git checkout, model regeneration) the server must revalidate
            // against: all engine inputs — config (bpmn/texts/policy), ui (layouts/settings),
            // models (schema + C# classes) — plus App.csproj for the runtime-version gate.
            fileEvents: [
                vscode.workspace.createFileSystemWatcher('**/App/{config,ui,models}/**'),
                vscode.workspace.createFileSystemWatcher('**/App/App.csproj'),
            ],
        },
        outputChannelName: 'Altinn Studio Language Server',
        revealOutputChannelOn: RevealOutputChannelOn.Never,
    };

    client = new LanguageClient(
        'altinnStudioLsp',
        'Altinn Studio Language Server',
        serverOptions,
        clientOptions,
    );

    try {
        await client.start();
    } catch (err) {
        client = undefined;
        void vscode.window.showErrorMessage(
            `Altinn Studio Language Server failed to start: ${errorMessage(err)}`,
        );
    }
}

async function stop(): Promise<void> {
    const current = client;
    client = undefined;
    if (current) {
        await current.stop();
    }
}

/** Resolve true if the command can be spawned (exists on PATH / at the given path). */
function canSpawn(command: string): Promise<boolean> {
    return new Promise((resolve) => {
        const probe = spawn(command, ['--version'], { stdio: 'ignore' });
        probe.on('error', () => resolve(false));
        probe.on('exit', () => resolve(true));
    });
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}
