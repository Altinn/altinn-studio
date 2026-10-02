using System.Security;
using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Parsers;

namespace Altinn.Studio.AppConfig;

public sealed partial class AppSymbols
{
    public IReadOnlyList<Edit> ProposeRename(string file, int line, int col, string newName)
    {
        ArgumentNullException.ThrowIfNull(file);
        var model = _config.Current;
        return SymbolAt(model, file, line, col) is { } sym ? ProposeRename(model, sym, newName) : Array.Empty<Edit>();
    }

    public IReadOnlyList<Edit> ProposeRename(Symbol symbol, string newName) =>
        ProposeRename(_config.Current, symbol, newName);

    private IReadOnlyList<Edit> ProposeRename(AppModel model, Symbol symbol, string newName) =>
        symbol.Kind switch
        {
            SymbolKind.Component or SymbolKind.DataType or SymbolKind.TextKey => UniformRename(model, symbol, newName),
            SymbolKind.Task => TaskRename(model, symbol, newName),
            SymbolKind.Page => PageRename(model, symbol, newName),
            _ => Array.Empty<Edit>(),
        };

    private IReadOnlyList<Edit> TaskRename(AppModel model, Symbol sym, string newName)
    {
        if (!IsSafePathSegment(newName) || string.Equals(newName, sym.Value, StringComparison.Ordinal))
            return Array.Empty<Edit>();
        var uses = model
            .Refs.TaskIds.Where(r => string.Equals(r.Value, sym.Value, StringComparison.Ordinal))
            .Select(r => _config.ResolvePosition(r.Position));
        if (ReplaceTokens(uses, newName) is not { } edits)
            return Array.Empty<Edit>();
        var xmlQuoted = "\"" + SecurityElement.Escape(newName) + "\"";
        var bpmn = _config.ReadAllBytes("App/config/process/process.bpmn");
        if (bpmn is not null)
            foreach (var span in ProcessParser.TaskIdAttributeSites(bpmn, sym.Value))
                edits.Add(new ReplaceEdit(span, CaptureInnerText(span), xmlQuoted));
        var oldDir = "App/ui/" + sym.Value;
        if (model.LayoutSets.Any(s => string.Equals(s.Id, sym.Value, StringComparison.Ordinal)))
            foreach (var f in _config.EnumerateFiles(oldDir, "*", recursive: true))
                edits.Add(new RenameFileEdit(f, "App/ui/" + newName + f[oldDir.Length..]));
        return edits;
    }

    private IReadOnlyList<Edit> PageRename(AppModel model, Symbol sym, string newName)
    {
        if (!IsSafePathSegment(newName) || string.Equals(newName, sym.Value, StringComparison.Ordinal))
            return Array.Empty<Edit>();

        string? oldFile = null;
        foreach (var f in model.LayoutFiles)
        {
            if (!string.Equals(AppPaths.SetIdOf(f), sym.Scope, StringComparison.Ordinal))
                continue;
            var name = Path.GetFileNameWithoutExtension(f);
            if (string.Equals(name, sym.Value, StringComparison.Ordinal))
                oldFile = f;
            else if (string.Equals(name, newName, StringComparison.Ordinal))
                return Array.Empty<Edit>();
        }

        if (ReplaceTokens(ReferenceSites(model, sym), newName) is not { } edits)
            return Array.Empty<Edit>();
        if (oldFile is not null)
            edits.Add(new RenameFileEdit(oldFile, oldFile[..(oldFile.LastIndexOf('/') + 1)] + newName + ".json"));
        return edits;
    }

    private static readonly char[] _pathSeparators = { '/', '\\' };

    private static bool IsSafePathSegment(string name) =>
        name.Length > 0 && name.IndexOfAny(_pathSeparators) < 0 && name is not ("." or "..");

    private IReadOnlyList<Edit> UniformRename(AppModel model, Symbol sym, string newName)
    {
        var sites = ReferenceSites(model, sym);
        sites.AddRange(DeclarationTokens(model, sym));
        return ReplaceTokens(sites, newName) is { } edits ? edits : Array.Empty<Edit>();
    }

    private List<Edit>? ReplaceTokens(IEnumerable<SourceSpan> sites, string newName)
    {
        var edits = new List<Edit>();
        foreach (var site in sites)
        {
            if (!HasExtent(site))
                return null;
            var literal = ProcessParser.IsElementTextSite(site)
                ? SecurityElement.Escape(newName)
                : JsonSerializer.Serialize(newName);
            edits.Add(new ReplaceEdit(site, CaptureInnerText(site), literal));
        }
        return edits;
    }

    private static bool HasExtent(SourceSpan span) =>
        span.Line > 0 && span.Column > 0 && span.EndLine > 0 && span.EndColumn > 0;

    public RenamePrepare? PrepareRename(string file, int line, int col)
    {
        ArgumentNullException.ThrowIfNull(file);
        if (
            SymbolAt(_config.Current, file, line, col) is not { } sym
            || sym.Kind
                is SymbolKind.OptionsId
                    or SymbolKind.LayoutSet
                    or SymbolKind.CSharpClass
                    or SymbolKind.DataModelPath
        )
            return null;
        if (_config.ResolveNodeAt(file, line, col) is not { } node)
            return null;
        if (sym.Kind == SymbolKind.Page && node.Pointer.Length == 0)
            return null;

        var innerEnd = node.EndColumn - 1;
        return new RenamePrepare(
            new SourceSpan(node.File, "", node.Line, node.Column + 1, node.EndLine, innerEnd),
            sym.Value
        );
    }

    private List<SourceSpan> DeclarationTokens(AppModel model, Symbol sym)
    {
        var result = new List<SourceSpan>();
        foreach (var span in model.SymbolTable.DeclarationsOf(sym))
        {
            var token = sym.Kind == SymbolKind.Component ? span with { Pointer = span.Pointer + "/id" } : span;
            result.Add(ResolveSpan(token));
        }
        return result;
    }

    private string CaptureInnerText(SourceSpan span)
    {
        var bytes = _config.ReadAllBytes(span.File);
        return bytes is null ? "" : Spans.ReadOrEmpty(bytes, span);
    }
}

public sealed record RenamePrepare(SourceSpan Range, string Placeholder);
