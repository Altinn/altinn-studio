using System.Text.Json;
using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.AppConfig.Validation.Schemas;

namespace Altinn.Studio.AppConfigLsp;

/// <summary>
/// Debounced validation of the workspace and publishing of the resulting diagnostics,
/// deduplicated per URI so unchanged sets aren't re-sent. <paramref name="sync"/> is the
/// server's handler lock; the debounce timer takes it before validating.
/// </summary>
internal sealed class DiagnosticsPublisher(
    object sync,
    WorkspaceState workspace,
    LspConversions convert,
    LspTransport transport,
    Logger log,
    Func<SchemaSet?> schemas,
    Action<string?> observeAppVersion
)
{
    private const int DebounceMs = 150;

    private readonly Dictionary<string, string> _published = new(StringComparer.Ordinal);
    private Timer? _timer;
    private bool _pending;

    // Called with the handler lock held (all callers run inside a handler).
    public void Schedule()
    {
        _pending = true;
        _timer ??= new Timer(_ => Debounced(), null, Timeout.Infinite, Timeout.Infinite);
        _timer.Change(DebounceMs, Timeout.Infinite);
    }

    // Called with the handler lock held.
    public void Flush()
    {
        if (!_pending)
            return;
        _pending = false;
        Validate();
    }

    public void Stop() => _timer?.Dispose();

    private void Debounced()
    {
        try
        {
            lock (sync)
                Flush();
        }
        catch (Exception ex)
        {
            log.Log(LogLevel.Error, $"debounced validation failed: {ex}");
        }
    }

    private void Validate()
    {
        if (!workspace.HasWorkspace)
            return;

        var engine = workspace.EnsureEngine();
        if (engine is null)
            return;

        IReadOnlyList<Finding> findings;
        try
        {
            observeAppVersion(engine.Current.AltinnAppVersion);
            findings = schemas() is { } loaded ? engine.ValidateAll(loaded).Findings : engine.Validate().Findings;
        }
        catch (Exception ex)
        {
            log.Log(LogLevel.Error, $"validation failed: {ex}");
            return;
        }

        var byUri = new Dictionary<string, List<Diagnostic>>(StringComparer.Ordinal);
        foreach (var f in findings)
        {
            var pos = engine.ResolvePosition(f.Position);
            if (string.IsNullOrEmpty(pos.File))
                continue;
            var uri = workspace.ToUri(pos.File);
            if (!byUri.TryGetValue(uri, out var list))
                byUri[uri] = list = new List<Diagnostic>();
            list.Add(convert.ToDiagnostic(f, pos));
        }

        log.Log(LogLevel.Debug, $"validated: {findings.Count} finding(s) across {byUri.Count} file(s)");
        foreach (var (uri, diagnostics) in byUri)
            Publish(uri, diagnostics);
        // Clear files that went clean (the publish mutates _published, hence the snapshot).
        foreach (var uri in _published.Keys.Where(u => !byUri.ContainsKey(u)).ToList())
            Publish(uri, Array.Empty<Diagnostic>());
    }

    // A publish replaces the URI's whole state, so the wire format is the identity to dedupe on.
    private void Publish(string uri, IReadOnlyList<Diagnostic> diagnostics)
    {
        var payload = JsonSerializer.Serialize(diagnostics, LspJson.Options);
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
        transport.Notify("textDocument/publishDiagnostics", new PublishDiagnosticsParams(uri, diagnostics));
    }
}
