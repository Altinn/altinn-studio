using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfigLsp;

/// <summary>
/// The workspace root, the open-document overlay on top of it, and the engine/symbol index
/// derived from both — including the per-document UTF-16 position maps, which cache the same
/// overlay content. Callers hold the server's handler lock.
/// </summary>
internal sealed class WorkspaceState(LspTransport transport, Logger log)
{
    private string _root = "";
    private bool _engineOpenFailureShown;
    private OverlayAppDirectory? _workspace;
    private AppConfigEngine? _engine;
    private AppSymbols? _symbols;

    private readonly Dictionary<string, string> _openDocuments = new(StringComparer.Ordinal);
    private readonly Dictionary<string, Utf16Mapper> _mappers = new(StringComparer.Ordinal);

    public string Root => _root;
    public bool HasWorkspace => _workspace is not null;
    public AppConfigEngine? Engine => _engine;
    public AppSymbols? Symbols => _symbols;

    public void SetRoot(string root)
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
        log.Log(LogLevel.Info, $"workspace root = {root}");
    }

    /// <summary>True when the document is inside the app, so diagnostics need refreshing.</summary>
    public bool SetDocument(string? uri, string? text)
    {
        var path = LocalPath(uri);
        if (path is null || _workspace is null)
            return false;
        _openDocuments[path] = text ?? "";
        if (Relativize(path) is not { } rel)
            return false;
        _workspace.Set(rel, text ?? "");
        _mappers.Remove(rel); // document content changed → drop its cached position map
        return true;
    }

    public void CloseDocument(string? uri)
    {
        var path = LocalPath(uri);
        if (path is null)
            return;
        _openDocuments.Remove(path);
        if (Relativize(path) is { } rel)
        {
            _workspace?.Clear(rel);
            _mappers.Remove(rel); // reverted to disk content → drop its cached position map
        }
    }

    public void InvalidateMappers() => _mappers.Clear();

    public AppConfigEngine? EnsureEngine()
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
            log.Log(LogLevel.Error, $"engine open failed: {ex}");
            if (!_engineOpenFailureShown)
            {
                _engineOpenFailureShown = true;
                transport.Notify(
                    "window/showMessage",
                    new ShowMessageParams(Type: 1, $"studioctl-lsp: cannot analyze this app: {ex.Message}")
                );
            }
            return null;
        }
    }

    public Utf16Mapper? MapperFor(string? rel)
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

    public static bool IsAppDirectory(string? path) =>
        !string.IsNullOrEmpty(path) && Directory.Exists(Path.Combine(path, "App", "config"));

    public static string? LocalPath(string? uri)
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

    public string? ToRelative(string? uri) => Relativize(LocalPath(uri));

    public string? Relativize(string? path)
    {
        if (path is null)
            return null;
        var rel = Path.GetRelativePath(_root, path).Replace('\\', '/');
        return rel.StartsWith("..", StringComparison.Ordinal) ? null : rel;
    }

    public string ToUri(string relativeFile) => new Uri(Path.Combine(_root, relativeFile)).AbsoluteUri;
}
