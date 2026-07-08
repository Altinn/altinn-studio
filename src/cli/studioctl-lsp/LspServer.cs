using System.Buffers;
using System.Diagnostics.CodeAnalysis;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Validation;
using StreamJsonRpc;
using StreamJsonRpc.Protocol;

namespace Altinn.Studio.AppConfigLsp;

public enum LogLevel
{
    Error,
    Warning,
    Info,
    Debug,
    Trace,
}

public sealed class LspServer
{
    private static readonly JsonSerializerOptions _jsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private const int InvalidRequestCode = -32600;
    private const int InternalErrorCode = -32603;

    private readonly Stream _in;
    private readonly Stream _out;

    private string _root = "";
    private bool _shutdownRequested;
    private bool _engineOpenFailureShown;
    private OverlayAppDirectory? _workspace;
    private AppConfigEngine? _engine;
    private AppSymbols? _symbols;

    private readonly Dictionary<string, string> _published = new(StringComparer.Ordinal);

    private readonly Dictionary<string, string> _openDocuments = new(StringComparer.Ordinal);

    private readonly object _sync = new();
    private readonly object _outLock = new();
    private readonly TaskCompletionSource _exited = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private Timer? _validateTimer;
    private bool _validatePending;
    private const int ValidateDebounceMs = 150;

    private readonly Dictionary<string, Utf16Mapper> _mappers = new(StringComparer.Ordinal);
    private readonly LogLevel _logLevel;

    public LspServer(Stream input, Stream output)
    {
        _in = input;
        _out = output;
        _logLevel = ParseLogLevel(Environment.GetEnvironmentVariable("STUDIOCTL_LSP_LOG"));
    }

    /// <summary>
    /// Serve messages until the stream closes or <c>exit</c>. Returns the process exit code per
    /// the protocol: 0 when <c>exit</c> follows a <c>shutdown</c>, 1 otherwise
    /// </summary>
    public int Run()
    {
        Log(LogLevel.Info, $"started (log level {_logLevel.ToString().ToLowerInvariant()}); waiting for initialize");
        var formatter = new SystemTextJsonFormatter();
        formatter.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        formatter.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        var rpc = new JsonRpc(new FrameHandler(this, formatter));
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
                Log(LogLevel.Error, $"connection terminated: {reason.Message}");
            try
            {
                lock (_sync)
                    FlushValidate();
            }
            catch (Exception ex)
            {
                Log(LogLevel.Error, $"final validation flush failed: {ex}");
            }
            _validateTimer?.Dispose();
        }
        Log(LogLevel.Info, "exiting");
        return _shutdownRequested ? 0 : 1;
    }

    private void Log(LogLevel level, string message)
    {
        if (level > _logLevel)
            return;
        Console.Error.WriteLine(
            $"[{DateTime.Now:HH:mm:ss.fff}] studioctl-lsp {level.ToString().ToLowerInvariant()}: {message}"
        );
    }

    private static LogLevel ParseLogLevel(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "error" => LogLevel.Error,
            "warn" or "warning" => LogLevel.Warning,
            "debug" => LogLevel.Debug,
            "trace" => LogLevel.Trace,
            _ => LogLevel.Info,
        };

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
        public Hover? Hover(TextDocumentPositionParams? p = null) => s.Request(() => s.OnHover(Required(p)));

        [JsonRpcMethod("textDocument/definition", UseSingleObjectParameterDeserialization = true)]
        public List<Location> Definition(TextDocumentPositionParams? p = null) =>
            s.Request(() => s.Locations(s.Navigate(Required(p), (e, f, l, c) => e.Definition(f, l, c))));

        [JsonRpcMethod("textDocument/references", UseSingleObjectParameterDeserialization = true)]
        public List<Location> References(ReferenceParams? p = null) =>
            s.Request(() =>
            {
                var r = Required(p);
                return s.Locations(
                    s.Navigate(
                        new TextDocumentPositionParams(r.TextDocument, r.Position),
                        (e, f, l, c) => e.References(f, l, c, r.Context?.IncludeDeclaration ?? false)
                    )
                );
            });

        [JsonRpcMethod("textDocument/completion", UseSingleObjectParameterDeserialization = true)]
        public CompletionList Completion(TextDocumentPositionParams? p = null) =>
            s.Request(() => s.OnCompletion(Required(p)));

        [JsonRpcMethod("textDocument/codeAction", UseSingleObjectParameterDeserialization = true)]
        public List<CodeAction> CodeAction(CodeActionParams? p = null) => s.Request(() => s.OnCodeActions(Required(p)));

        [JsonRpcMethod("textDocument/codeLens", UseSingleObjectParameterDeserialization = true)]
        public List<CodeLens> CodeLens(CodeLensParams? p = null) => s.Request(() => s.OnCodeLenses(Required(p)));

        [JsonRpcMethod("textDocument/prepareRename", UseSingleObjectParameterDeserialization = true)]
        public PrepareRenameResult? PrepareRename(TextDocumentPositionParams? p = null) =>
            s.Request(() => s.OnPrepareRename(Required(p)));

        [JsonRpcMethod("textDocument/rename", UseSingleObjectParameterDeserialization = true)]
        public WorkspaceEdit? Rename(RenameParams? p = null) => s.Request(() => s.OnRename(Required(p)));

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
                Log(LogLevel.Error, $"request failed: {ex}");
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
                Log(LogLevel.Error, $"notification failed: {ex}");
            }
        }
    }

    private InitializeResult OnInitialize(InitializeParams? p)
    {
        SetRoot(ResolveRoot(p));
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

    private void SetRoot(string root)
    {
        _root = root;
        _workspace = new OverlayAppDirectory(new FileSystemAppDirectory(root));
        _engine = null;
        _symbols = null;
        _engineOpenFailureShown = false;
        _mappers.Clear();
        foreach (var (path, text) in _openDocuments)
            if (Relativize(path) is { } rel)
                _workspace.Set(rel, text);
        Log(LogLevel.Info, $"workspace root = {root}");
    }

    private void OnDidChangeWorkspaceFolders(DidChangeWorkspaceFoldersParams? p)
    {
        var added = p?.Event?.Added ?? [];
        if (added.Length == 0 || IsAppDirectory(_root))
            return;
        var candidates = added.Select(f => LocalPath(f.Uri)).OfType<string>().ToList();
        var next = candidates.FirstOrDefault(IsAppDirectory) ?? candidates.FirstOrDefault();
        if (next is null || string.Equals(next, _root, StringComparison.Ordinal))
            return;
        SetRoot(next);
        ScheduleValidate();
    }

    private static bool IsAppDirectory(string? path) =>
        !string.IsNullOrEmpty(path) && Directory.Exists(Path.Combine(path, "App", "config"));

    private void OnDidChange(DidChangeTextDocumentParams? p)
    {
        // An empty change array means "no change" — never wipe the document over it.
        if (p?.ContentChanges is { Length: > 0 } changes)
            SetDocument(p.TextDocument?.Uri, changes[^1].Text);
    }

    private void OnDidClose(string? uri)
    {
        var path = LocalPath(uri);
        if (path is not null)
        {
            _openDocuments.Remove(path);
            if (Relativize(path) is { } rel)
            {
                _workspace?.Clear(rel);
                _mappers.Remove(rel); // reverted to disk content → drop its cached position map
            }
        }
        ScheduleValidate();
    }

    private void OnDidChangeWatchedFiles()
    {
        _mappers.Clear();
        ScheduleValidate();
    }

    private void SetDocument(string? uri, string? text)
    {
        var path = LocalPath(uri);
        if (path is null || _workspace is null)
            return;
        _openDocuments[path] = text ?? "";
        if (Relativize(path) is { } rel)
        {
            _workspace.Set(rel, text ?? "");
            _mappers.Remove(rel); // document content changed → drop its cached position map
            ScheduleValidate();
        }
    }

    // Called with _sync held (all callers run inside a handler).
    private void ScheduleValidate()
    {
        _validatePending = true;
        _validateTimer ??= new Timer(_ => DebouncedValidate(), null, Timeout.Infinite, Timeout.Infinite);
        _validateTimer.Change(ValidateDebounceMs, Timeout.Infinite);
    }

    private void DebouncedValidate()
    {
        try
        {
            lock (_sync)
                FlushValidate();
        }
        catch (Exception ex)
        {
            Log(LogLevel.Error, $"debounced validation failed: {ex}");
        }
    }

    // Called with _sync held.
    private void FlushValidate()
    {
        if (!_validatePending)
            return;
        _validatePending = false;
        Validate();
    }

    private Utf16Mapper? MapperFor(string? rel)
    {
        if (rel is null || _workspace is null)
            return null;
        if (_mappers.TryGetValue(rel, out var cached))
            return cached;
        var bytes = _workspace.ReadAllBytes(rel);
        if (bytes is null)
            return null;
        var mapper = new Utf16Mapper(bytes);
        _mappers[rel] = mapper;
        return mapper;
    }

    // An LSP request's 0-based (line, character[UTF-16]) → the engine's 1-based (line, byte column).
    private int InputByteColumn(string? rel, Position position) =>
        MapperFor(rel)?.ToByteColumn(position.Line, position.Character) ?? position.Character + 1;

    private void Validate()
    {
        if (_workspace is null)
            return;

        var engine = EnsureEngine();
        if (engine is null)
            return;

        IReadOnlyList<Finding> findings;
        try
        {
            findings = ValidationEngine.Run(engine.Build()).Findings;
        }
        catch (Exception ex)
        {
            Log(LogLevel.Error, $"validation failed: {ex}");
            return;
        }

        var byUri = new Dictionary<string, List<Diagnostic>>(StringComparer.Ordinal);
        foreach (var f in findings)
        {
            var pos = engine.ResolvePosition(f.Position);
            if (string.IsNullOrEmpty(pos.File))
                continue;
            var uri = ToUri(pos.File);
            if (!byUri.TryGetValue(uri, out var list))
                byUri[uri] = list = new List<Diagnostic>();
            list.Add(ToDiagnostic(f, pos));
        }

        Log(LogLevel.Debug, $"validated: {findings.Count} finding(s) across {byUri.Count} file(s)");
        foreach (var (uri, diagnostics) in byUri)
            PublishDiagnostics(uri, diagnostics);
        // Clear files that went clean (the publish mutates _published, hence the snapshot).
        foreach (var uri in _published.Keys.Where(u => !byUri.ContainsKey(u)).ToList())
            PublishDiagnostics(uri, Array.Empty<Diagnostic>());
    }

    private Diagnostic ToDiagnostic(Finding f, SourceSpan pos) =>
        new(
            LspRange(pos),
            f.Severity switch
            {
                Severity.Error => 1,
                Severity.Warning => 2,
                _ => 3,
            },
            "altinn-appconfig",
            f.RuleId,
            f.Message
        );

    // Engine columns are 1-based UTF-8 bytes (end exclusive); LSP characters are 0-based UTF-16.
    private Range LspRange(SourceSpan pos)
    {
        var map = MapperFor(pos.File);
        var start = LspStart(pos);
        var endLine = pos.EndLine > 0 ? pos.EndLine - 1 : start.Line;
        var endCh = ToUtf16Column(map, pos.EndLine, pos.EndColumn, fallback: start.Character + 1);
        return new Range(start, new Position(endLine, endCh));
    }

    private Position LspStart(SourceSpan pos)
    {
        var map = MapperFor(pos.File);
        var line = pos.Line > 0 ? pos.Line - 1 : 0;
        var ch = ToUtf16Column(map, pos.Line, pos.Column, fallback: 0);
        return new Position(line, ch);
    }

    private static int ToUtf16Column(Utf16Mapper? map, int line, int column, int fallback)
    {
        if (map is not null && line > 0 && column > 0)
            return map.ToUtf16Character(line, column);
        return column > 0 ? column - 1 : fallback;
    }

    private AppConfigEngine? EnsureEngine()
    {
        if (_engine is not null)
            return _engine;
        if (_workspace is null)
            return null;
        try
        {
            _engine = AppConfigEngine.Open(_workspace);
            _symbols = new AppSymbols(_engine);
            return _engine;
        }
        catch (Exception ex)
        {
            Log(LogLevel.Error, $"engine open failed: {ex}");
            if (!_engineOpenFailureShown)
            {
                _engineOpenFailureShown = true;
                Notify(
                    "window/showMessage",
                    new ShowMessageParams(Type: 1, $"studioctl-lsp: cannot analyze this app: {ex.Message}")
                );
            }
            return null;
        }
    }

    // Shared prologue of every engine-reading request: flush pending validation (answer against
    // the latest buffer, not the debounce-pending state), ensure the engine, and resolve the
    // request's document. False when the engine isn't ready or the URI is outside the app.
    private bool TryResolveRequest(
        TextDocumentIdentifier? textDocument,
        [NotNullWhen(true)] out string? rel,
        [NotNullWhen(true)] out AppSymbols? symbols
    )
    {
        FlushValidate();
        EnsureEngine();
        rel = ToRelative(textDocument?.Uri);
        symbols = _symbols;
        return rel is not null && symbols is not null;
    }

    // The request's 0-based cursor as the engine's 1-based line + byte column.
    private (int Line1, int ByteCol) CursorOf(Position position, string rel) =>
        (position.Line + 1, InputByteColumn(rel, position));

    private IReadOnlyList<SourceSpan> Navigate(
        TextDocumentPositionParams p,
        Func<AppSymbols, string, int, int, IReadOnlyList<SourceSpan>> query
    )
    {
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return Array.Empty<SourceSpan>();
        var (line1, byteCol) = CursorOf(p.Position, rel);
        return query(symbols, rel, line1, byteCol);
    }

    private List<Location> Locations(IReadOnlyList<SourceSpan> spans)
    {
        var list = new List<Location>(spans.Count);
        foreach (var s in spans)
            list.Add(new Location(ToUri(s.File), LspRange(s)));
        return list;
    }

    private CompletionList OnCompletion(TextDocumentPositionParams p)
    {
        var items = new List<CompletionItem>();
        if (TryResolveRequest(p.TextDocument, out var rel, out var symbols))
        {
            var (line1, byteCol) = CursorOf(p.Position, rel);
            foreach (var s in symbols.Completions(rel, line1, byteCol))
            {
                items.Add(
                    new CompletionItem(
                        s.Label,
                        s.Detail,
                        // LSP CompletionItemKind: Field=5, Class=7, File=17, Reference=18, EnumMember=20, Constant=21.
                        s.Kind switch
                        {
                            SuggestionKind.DataModelPath => 5,
                            SuggestionKind.DataType => 7,
                            SuggestionKind.Component => 18,
                            SuggestionKind.Page => 17,
                            SuggestionKind.Task => 20,
                            SuggestionKind.OptionsId => 17,
                            _ => 21,
                        }
                    )
                );
            }
        }
        return new CompletionList(IsIncomplete: false, items);
    }

    // Rename the symbol under the cursor everywhere: a WorkspaceEdit replacing each
    // token with its (JSON-quoted) new value. Null when nothing renameable.
    private WorkspaceEdit? OnRename(RenameParams p)
    {
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return null;
        var newName = p.NewName ?? "";
        if (newName.Length == 0)
            return null;

        var (line1, byteCol) = CursorOf(p.Position, rel);
        var edits = symbols.ProposeRename(rel, line1, byteCol, newName);
        if (edits.Count == 0)
            return null;

        // A rename that also moves files needs the documentChanges form: text edits first
        // (on the pre-rename URIs), then the RenameFile operations.
        var textByUri = new Dictionary<string, List<TextEdit>>(StringComparer.Ordinal);
        var renames = new List<object>();
        foreach (var e in edits)
        {
            switch (e)
            {
                case ReplaceEdit re:
                    var uri = ToUri(re.Span.File);
                    if (!textByUri.TryGetValue(uri, out var list))
                        textByUri[uri] = list = new List<TextEdit>();
                    // ReplaceEdit.NewValue is the literal splice text (already JSON-quoted for a string token).
                    list.Add(new TextEdit(LspRange(re.Span), re.NewValue));
                    break;
                case RenameFileEdit mv:
                    renames.Add(
                        new RenameFile(
                            ToUri(mv.OldPath),
                            ToUri(mv.NewPath),
                            new RenameFileOptions(Overwrite: false, IgnoreIfExists: false)
                        )
                    );
                    break;
            }
        }
        if (renames.Count == 0)
            return new WorkspaceEdit(Changes: textByUri);
        var documentChanges = new List<object>();
        foreach (var kv in textByUri)
            documentChanges.Add(
                new TextDocumentEdit(new OptionalVersionedTextDocumentIdentifier(kv.Key, Version: null), kv.Value)
            );
        documentChanges.AddRange(renames);
        return new WorkspaceEdit(DocumentChanges: documentChanges);
    }

    // The command is registered client-side by the VS Code extension.
    private List<CodeLens> OnCodeLenses(CodeLensParams p)
    {
        var lenses = new List<CodeLens>();
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return lenses;
        var uri = ToUri(rel);
        foreach (var lens in symbols.CodeLenses(rel))
        {
            lenses.Add(
                new CodeLens(
                    LspRange(lens.Range),
                    new Command(
                        lens.Title,
                        "altinnAppConfig.showReferences",
                        [
                            uri,
                            LspStart(lens.Range),
                            lens.Locations.Select(l => new Location(ToUri(l.File), LspRange(l))).ToList(),
                        ]
                    )
                )
            );
        }
        return lenses;
    }

    private List<CodeAction> OnCodeActions(CodeActionParams p)
    {
        var actions = new List<CodeAction>();
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return actions;
        var uri = p.TextDocument.Uri;
        if (uri is null || p.Context?.Diagnostics is not { } diagnostics)
            return actions;

        foreach (var d in diagnostics)
        {
            if (d.Source != "altinn-appconfig" || d.Range is null)
                continue;
            var start = d.Range.Start;
            // `start` is UTF-16 (from our own publish); convert back to a byte column.
            var suggestion = symbols.SuggestCorrection(rel, start.Line + 1, InputByteColumn(rel, start));
            if (suggestion is null)
                continue;
            actions.Add(
                new CodeAction(
                    $"Change to \"{suggestion}\"",
                    "quickfix",
                    [d],
                    IsPreferred: true,
                    new WorkspaceEdit(
                        Changes: new Dictionary<string, List<TextEdit>>
                        {
                            [uri] = [new TextEdit(d.Range, JsonSerializer.Serialize(suggestion))],
                        }
                    )
                )
            );
        }
        return actions;
    }

    private PrepareRenameResult? OnPrepareRename(TextDocumentPositionParams p)
    {
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return null;
        var (line1, byteCol) = CursorOf(p.Position, rel);
        if (symbols.PrepareRename(rel, line1, byteCol) is not { } pr)
            return null;
        return new PrepareRenameResult(LspRange(pr.Range), pr.Placeholder);
    }

    private Hover? OnHover(TextDocumentPositionParams p)
    {
        FlushValidate(); // answer against the latest buffer, not the debounce-pending state
        var rel = ToRelative(p.TextDocument.Uri);
        if (rel is null || _engine is null)
            return null;
        var byteCol = InputByteColumn(rel, p.Position);
        if (_engine.ResolveNodeAt(rel, p.Position.Line + 1, byteCol) is not { } node)
            return null;

        var sb = new StringBuilder();
        if (_symbols?.SymbolHover(rel, p.Position.Line + 1, byteCol) is { } symbolCard)
        {
            sb.Append(symbolCard);
        }
        else
        {
            sb.Append('`').Append(string.IsNullOrEmpty(node.Pointer) ? "/" : node.Pointer).Append('`');
            if (node.Key)
                sb.Append(" _(property name)_");
        }
        return new Hover(new MarkupContent("markdown", sb.ToString()), LspRange(node));
    }

    // A publish replaces the URI's whole state, so the wire format is the identity to dedupe on.
    private void PublishDiagnostics(string uri, IReadOnlyList<Diagnostic> diagnostics)
    {
        var payload = JsonSerializer.Serialize(diagnostics, _jsonOpts);
        if (diagnostics.Count == 0)
        {
            if (!_published.Remove(uri))
                return;
        }
        else
        {
            if (_published.TryGetValue(uri, out var prev) && string.Equals(prev, payload, StringComparison.Ordinal))
                return;
            _published[uri] = payload;
        }
        Notify("textDocument/publishDiagnostics", new PublishDiagnosticsParams(uri, diagnostics));
    }

    private static string ResolveRoot(InitializeParams? p)
    {
        var folders = (p?.WorkspaceFolders ?? []).Select(f => LocalPath(f.Uri)).OfType<string>().ToList();
        if (folders.Count > 0)
            return folders.FirstOrDefault(IsAppDirectory) ?? folders[0];
        if (LocalPath(p?.RootUri) is { } fromUri)
            return fromUri;
        return p?.RootPath ?? Directory.GetCurrentDirectory();
    }

    private static string? LocalPath(string? uri)
    {
        if (string.IsNullOrEmpty(uri))
            return null;
        try
        {
            return new Uri(uri).LocalPath;
        }
        catch (UriFormatException)
        {
            return null;
        }
    }

    private string? ToRelative(string? uri) => Relativize(LocalPath(uri));

    private string? Relativize(string? path)
    {
        if (path is null)
            return null;
        var rel = Path.GetRelativePath(_root, path).Replace('\\', '/');
        return rel.StartsWith("..", StringComparison.Ordinal) ? null : rel;
    }

    private string ToUri(string relativeFile) => new Uri(Path.Combine(_root, relativeFile)).AbsoluteUri;

    private sealed record NotificationEnvelope(string Jsonrpc, string Method, object Params);

    private sealed record ErrorEnvelope(
        string Jsonrpc,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] object? Id,
        ErrorDetail Error
    );

    private sealed record ErrorDetail(int Code, string Message);

    private void Notify(string method, object parameters)
    {
        Log(LogLevel.Trace, $"send {method}");
        WriteFrame(JsonSerializer.SerializeToUtf8Bytes(new NotificationEnvelope("2.0", method, parameters), _jsonOpts));
    }

    private void WriteParseError()
    {
        var envelope = new ErrorEnvelope("2.0", null, new ErrorDetail(-32700, "Parse error"));
        WriteFrame(JsonSerializer.SerializeToUtf8Bytes(envelope, _jsonOpts));
    }

    private void WriteFrame(ReadOnlySpan<byte> body)
    {
        var header = Encoding.ASCII.GetBytes($"Content-Length: {body.Length}\r\n\r\n");
        lock (_outLock)
        {
            _out.Write(header);
            _out.Write(body);
            _out.Flush();
        }
    }

    private byte[]? ReadFrame()
    {
        var contentLength = -1;
        for (var line = ReadLine(); !string.IsNullOrEmpty(line); line = ReadLine())
        {
            var colon = line.IndexOf(':');
            if (
                colon > 0
                && line[..colon].Trim().Equals("Content-Length", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(line[(colon + 1)..].Trim(), out var parsed)
            )
                contentLength = parsed;
        }
        if (contentLength < 0)
            return null;

        var buffer = new byte[contentLength];
        var read = 0;
        while (read < contentLength)
        {
            var n = _in.Read(buffer, read, contentLength - read);
            if (n <= 0)
                return null;
            read += n;
        }
        return buffer;
    }

    private string? ReadLine()
    {
        var sb = new StringBuilder();
        while (true)
        {
            var b = _in.ReadByte();
            if (b < 0)
                return sb.Length == 0 ? null : sb.ToString();
            if (b == '\n')
            {
                if (sb.Length > 0 && sb[^1] == '\r')
                    sb.Length--;
                return sb.ToString();
            }
            sb.Append((char)b);
        }
    }

    // JsonRpc treats end-of-input as loss of the whole connection and stops responding to
    // requests it has already received, so EOF is held back until every read request has had
    // its response written.
    private sealed class FrameHandler(LspServer server, SystemTextJsonFormatter formatter) : IJsonRpcMessageHandler
    {
        private readonly object _gate = new();
        private int _pendingResponses;

        public bool CanRead => true;
        public bool CanWrite => true;
        public IJsonRpcMessageFormatter Formatter => formatter;

        public ValueTask<JsonRpcMessage?> ReadAsync(CancellationToken cancellationToken)
        {
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var body = server.ReadFrame();
                if (body is null)
                {
                    lock (_gate)
                    {
                        while (_pendingResponses > 0)
                            Monitor.Wait(_gate);
                    }
                    return ValueTask.FromResult<JsonRpcMessage?>(null);
                }
                try
                {
                    var message = formatter.Deserialize(new ReadOnlySequence<byte>(body));
                    if (message is JsonRpcRequest { IsResponseExpected: true })
                        lock (_gate)
                            _pendingResponses++;
                    return ValueTask.FromResult<JsonRpcMessage?>(message);
                }
                catch (JsonException ex)
                {
                    server.Log(LogLevel.Error, $"malformed frame: {ex.Message}");
                    server.WriteParseError();
                }
            }
        }

        public ValueTask WriteAsync(JsonRpcMessage jsonRpcMessage, CancellationToken cancellationToken)
        {
            var buffer = new ArrayBufferWriter<byte>();
            formatter.Serialize(buffer, jsonRpcMessage);
            server.WriteFrame(buffer.WrittenSpan);
            if (jsonRpcMessage is JsonRpcResult or JsonRpcError)
                lock (_gate)
                {
                    _pendingResponses--;
                    Monitor.PulseAll(_gate);
                }
            return ValueTask.CompletedTask;
        }
    }
}
