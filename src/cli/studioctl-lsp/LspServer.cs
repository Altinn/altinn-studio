using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.AppConfig.Validation.Schemas;
using StreamJsonRpc;

namespace Altinn.Studio.AppConfigLsp;

/// <summary>
/// Wires the JSON-RPC endpoint to the components: <see cref="LspTransport"/> (framing),
/// <see cref="WorkspaceState"/> (root + document overlay), <see cref="DiagnosticsPublisher"/>
/// (validation), and <see cref="LanguageFeatures"/> (symbol-backed requests). Owns the
/// lifecycle (initialize/shutdown/exit) and the handler lock everything runs under.
/// </summary>
public sealed class LspServer
{
    private const int InvalidRequestCode = -32600;
    private const int InternalErrorCode = -32603;

    private readonly object _sync = new();
    private readonly TaskCompletionSource _exited = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly Logger _log;
    private readonly LspTransport _transport;
    private readonly WorkspaceState _workspace;
    private readonly LspConversions _convert;
    private readonly DiagnosticsPublisher _diagnostics;
    private readonly LanguageFeatures _features;

    private SchemaSet? _schemas;
    private string? _schemasVersion;
    private string? _loadingVersion;
    private string? _failedVersion;
    private bool _shutdownRequested;

    public LspServer(Stream input, Stream output)
    {
        _log = new Logger(Logger.ParseLevel(Environment.GetEnvironmentVariable("STUDIOCTL_LSP_LOG")));
        _transport = new LspTransport(input, output, _log);
        _workspace = new WorkspaceState(_transport, _log);
        _convert = new LspConversions(_workspace);
        _diagnostics = new DiagnosticsPublisher(
            _sync,
            _workspace,
            _convert,
            _transport,
            _log,
            () => _schemas,
            ObserveAppVersion
        );
        _features = new LanguageFeatures(_workspace, _convert, _diagnostics);
    }

    /// <summary>
    /// Serve messages until the stream closes or <c>exit</c>. Returns the process exit code per
    /// the protocol: 0 when <c>exit</c> follows a <c>shutdown</c>, 1 otherwise
    /// </summary>
    public int Run()
    {
        _log.Log(
            LogLevel.Info,
            $"started (log level {_log.Level.ToString().ToLowerInvariant()}); waiting for initialize"
        );
        var formatter = new SystemTextJsonFormatter();
        formatter.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        formatter.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        var rpc = new JsonRpc(new FrameHandler(_transport, _log, formatter));
        rpc.AddLocalRpcTarget(new Target(this), null);
        rpc.StartListening();
        try
        {
            Task.WaitAny(rpc.Completion, _exited.Task);
            rpc.DispatchCompletion.Wait();
        }
        finally
        {
            rpc.Dispose();
            if (rpc.Completion.Exception?.GetBaseException() is { } reason)
                _log.Log(LogLevel.Error, $"connection terminated: {reason.Message}");
            try
            {
                lock (_sync)
                    _diagnostics.Flush();
            }
            catch (Exception ex)
            {
                _log.Log(LogLevel.Error, $"final validation flush failed: {ex}");
            }
            _diagnostics.Stop();
        }
        _log.Log(LogLevel.Info, "exiting");
        return _shutdownRequested ? 0 : 1;
    }

    // Handlers are synchronous, so StreamJsonRpc dispatches messages strictly in arrival order.
    private sealed class Target(LspServer s)
    {
        [JsonRpcMethod("initialize", UseSingleObjectParameterDeserialization = true)]
        public InitializeResult Initialize(InitializeParams? p = null) => s.Request(() => s.OnInitialize(p));

        [JsonRpcMethod("shutdown")]
        public object? Shutdown()
        {
            lock (s._sync)
                s._shutdownRequested = true;
            return null;
        }

        [JsonRpcMethod("exit")]
        public void Exit() => s._exited.TrySetResult();

        [JsonRpcMethod("textDocument/didOpen", UseSingleObjectParameterDeserialization = true)]
        public void DidOpen(DidOpenTextDocumentParams? p = null) =>
            s.Notification(() => s.SetDocument(p?.TextDocument?.Uri, p?.TextDocument?.Text));

        [JsonRpcMethod("textDocument/didChange", UseSingleObjectParameterDeserialization = true)]
        public void DidChange(DidChangeTextDocumentParams? p = null) => s.Notification(() => s.OnDidChange(p));

        [JsonRpcMethod("textDocument/didClose", UseSingleObjectParameterDeserialization = true)]
        public void DidClose(DidCloseTextDocumentParams? p = null) =>
            s.Notification(() => s.OnDidClose(p?.TextDocument?.Uri));

        [JsonRpcMethod("workspace/didChangeWatchedFiles", UseSingleObjectParameterDeserialization = true)]
        public void DidChangeWatchedFiles(DidChangeWatchedFilesParams? p = null) =>
            s.Notification(s.OnDidChangeWatchedFiles);

        [JsonRpcMethod("workspace/didChangeWorkspaceFolders", UseSingleObjectParameterDeserialization = true)]
        public void DidChangeWorkspaceFolders(DidChangeWorkspaceFoldersParams? p = null) =>
            s.Notification(() => s.OnDidChangeWorkspaceFolders(p));

        [JsonRpcMethod("textDocument/hover", UseSingleObjectParameterDeserialization = true)]
        public Hover? Hover(TextDocumentPositionParams? p = null) => s.Request(() => s._features.OnHover(Required(p)));

        [JsonRpcMethod("textDocument/definition", UseSingleObjectParameterDeserialization = true)]
        public List<Location> Definition(TextDocumentPositionParams? p = null) =>
            s.Request(() =>
                s._convert.Locations(s._features.Navigate(Required(p), (e, f, l, c) => e.Definition(f, l, c)))
            );

        [JsonRpcMethod("textDocument/references", UseSingleObjectParameterDeserialization = true)]
        public List<Location> References(ReferenceParams? p = null) =>
            s.Request(() =>
            {
                var r = Required(p);
                return s._convert.Locations(
                    s._features.Navigate(
                        new TextDocumentPositionParams(r.TextDocument, r.Position),
                        (e, f, l, c) => e.References(f, l, c, r.Context?.IncludeDeclaration ?? false)
                    )
                );
            });

        [JsonRpcMethod("textDocument/completion", UseSingleObjectParameterDeserialization = true)]
        public CompletionList Completion(TextDocumentPositionParams? p = null) =>
            s.Request(() => s._features.OnCompletion(Required(p)));

        [JsonRpcMethod("textDocument/codeAction", UseSingleObjectParameterDeserialization = true)]
        public List<CodeAction> CodeAction(CodeActionParams? p = null) =>
            s.Request(() => s._features.OnCodeActions(Required(p)));

        [JsonRpcMethod("textDocument/codeLens", UseSingleObjectParameterDeserialization = true)]
        public List<CodeLens> CodeLens(CodeLensParams? p = null) =>
            s.Request(() => s._features.OnCodeLenses(Required(p)));

        [JsonRpcMethod("textDocument/prepareRename", UseSingleObjectParameterDeserialization = true)]
        public PrepareRenameResult? PrepareRename(TextDocumentPositionParams? p = null) =>
            s.Request(() => s._features.OnPrepareRename(Required(p)));

        [JsonRpcMethod("textDocument/rename", UseSingleObjectParameterDeserialization = true)]
        public WorkspaceEdit? Rename(RenameParams? p = null) => s.Request(() => s._features.OnRename(Required(p)));

        private static T Required<T>(T? value)
            where T : class => value ?? throw new InvalidOperationException("missing request params");
    }

    private T Request<T>(Func<T> handler)
    {
        lock (_sync)
        {
            if (_shutdownRequested)
                throw new LocalRpcException("server is shutting down") { ErrorCode = InvalidRequestCode };
            try
            {
                return handler();
            }
            catch (Exception ex)
            {
                _log.Log(LogLevel.Error, $"request failed: {ex}");
                throw new LocalRpcException(ex.Message, ex) { ErrorCode = InternalErrorCode };
            }
        }
    }

    private void Notification(Action handler)
    {
        lock (_sync)
        {
            if (_shutdownRequested)
                return;
            try
            {
                handler();
            }
            catch (Exception ex)
            {
                _log.Log(LogLevel.Error, $"notification failed: {ex}");
            }
        }
    }

    private InitializeResult OnInitialize(InitializeParams? p)
    {
        _workspace.SetRoot(ResolveRoot(p));
        _diagnostics.Schedule();
        return new InitializeResult(
            new ServerCapabilities(
                TextDocumentSync: 1,
                HoverProvider: true,
                DefinitionProvider: true,
                ReferencesProvider: true,
                RenameProvider: new RenameProviderOptions(PrepareProvider: true),
                CompletionProvider: new CompletionProviderOptions(),
                CodeActionProvider: new CodeActionProviderOptions(["quickfix"]),
                CodeLensProvider: new CodeLensProviderOptions(ResolveProvider: false),
                Workspace: new WorkspaceServerCapabilities(
                    new WorkspaceFoldersServerCapabilities(Supported: true, ChangeNotifications: true)
                )
            ),
            new ServerInfo("studioctl-lsp")
        );
    }

    private void ObserveAppVersion(string? version)
    {
        if (!string.Equals(version, _schemasVersion, StringComparison.Ordinal))
        {
            _schemas = null;
            _schemasVersion = version;
        }
        if (version is null || _schemas is not null || _loadingVersion is not null)
            return;
        if (string.Equals(version, _failedVersion, StringComparison.Ordinal))
            return;
        if (AppDistConfig.CreateProvider() is not { } appDist)
            return;
        _loadingVersion = version;
        Task.Run(async () =>
        {
            try
            {
                SchemaSet? schemas;
                using (appDist)
                    schemas = await AppDistConfig.LoadSchemasAsync(appDist, version);
                lock (_sync)
                {
                    _loadingVersion = null;
                    if (schemas is null)
                    {
                        _failedVersion = version;
                    }
                    else if (string.Equals(version, _schemasVersion, StringComparison.Ordinal))
                    {
                        _schemas = schemas;
                        _diagnostics.Schedule();
                    }
                }
                if (schemas is null)
                {
                    _log.Log(LogLevel.Info, $"app-dist {version} unreachable and not cached; schema pass disabled");
                    return;
                }
                foreach (var warning in schemas.LoadWarnings)
                    _log.Log(LogLevel.Warning, $"app-dist {version}: {warning}");
                _log.Log(LogLevel.Info, $"app-dist {version} schemas loaded");
            }
            catch (Exception ex)
            {
                lock (_sync)
                {
                    _loadingVersion = null;
                    _failedVersion = version;
                }
                _log.Log(LogLevel.Error, $"app-dist schema load failed: {ex}");
            }
        });
    }

    private static string ResolveRoot(InitializeParams? p)
    {
        var folders = (p?.WorkspaceFolders ?? [])
            .Select(f => WorkspaceState.LocalPath(f.Uri))
            .OfType<string>()
            .ToList();
        if (folders.Count > 0)
            return folders.FirstOrDefault(WorkspaceState.IsAppDirectory) ?? folders[0];
        if (WorkspaceState.LocalPath(p?.RootUri) is { } fromUri)
            return fromUri;
        return p?.RootPath ?? Directory.GetCurrentDirectory();
    }

    private void OnDidChangeWorkspaceFolders(DidChangeWorkspaceFoldersParams? p)
    {
        var added = p?.Event?.Added ?? [];
        if (added.Length == 0 || WorkspaceState.IsAppDirectory(_workspace.Root))
            return;
        var candidates = added.Select(f => WorkspaceState.LocalPath(f.Uri)).OfType<string>().ToList();
        var next = candidates.FirstOrDefault(WorkspaceState.IsAppDirectory) ?? candidates.FirstOrDefault();
        if (next is null || string.Equals(next, _workspace.Root, StringComparison.Ordinal))
            return;
        _workspace.SetRoot(next);
        _diagnostics.Schedule();
    }

    private void OnDidChange(DidChangeTextDocumentParams? p)
    {
        // An empty change array means "no change" — never wipe the document over it.
        if (p?.ContentChanges is { Length: > 0 } changes)
            SetDocument(p.TextDocument?.Uri, changes[^1].Text);
    }

    private void SetDocument(string? uri, string? text)
    {
        if (_workspace.SetDocument(uri, text))
            _diagnostics.Schedule();
    }

    private void OnDidClose(string? uri)
    {
        _workspace.CloseDocument(uri);
        _diagnostics.Schedule();
    }

    private void OnDidChangeWatchedFiles()
    {
        _workspace.InvalidateMappers();
        _failedVersion = null;
        _diagnostics.Schedule();
    }
}
