using System.Text;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Parsers;

namespace Altinn.Studio.AppConfig;

public sealed partial class AppSymbols
{
    public IReadOnlyList<Edit> ProposeRename(string file, int line, int col, string newName)
    {
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
            SymbolKind.DataModelPath => DataPathRename(model, symbol.Value, newName),
            _ => Array.Empty<Edit>(),
        };

    private IReadOnlyList<Edit> TaskRename(AppModel model, Symbol sym, string newName)
    {
        if (!IsSafePathSegment(newName) || string.Equals(newName, sym.Value, StringComparison.Ordinal))
            return Array.Empty<Edit>();
        var jsonQuoted = System.Text.Json.JsonSerializer.Serialize(newName);
        var xmlQuoted = "\"" + System.Security.SecurityElement.Escape(newName) + "\"";
        var edits = new List<Edit>();
        foreach (var r in model.Refs.TaskIds)
            if (string.Equals(r.Value, sym.Value, StringComparison.Ordinal))
            {
                var span = _config.ResolvePosition(r.Position);
                edits.Add(new ReplaceEdit(span, CaptureInnerText(span), jsonQuoted));
            }
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

        var quoted = System.Text.Json.JsonSerializer.Serialize(newName);
        var edits = new List<Edit>();
        foreach (var s in ReferenceSites(model, sym))
            edits.Add(new ReplaceEdit(s, CaptureInnerText(s), quoted));
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
        var quoted = System.Text.Json.JsonSerializer.Serialize(newName);
        return sites.Select(s => (Edit)new ReplaceEdit(s, CaptureInnerText(s), quoted)).ToList();
    }

    private IReadOnlyList<Edit> DataPathRename(AppModel model, string oldPath, string newLeaf)
    {
        var edits = new List<Edit>();
        var dot = oldPath.LastIndexOf('.');
        var newPath = dot < 0 ? newLeaf : oldPath[..(dot + 1)] + newLeaf;

        if (model.SchemaPropertyPositions.TryGetValue(oldPath, out var schemaSpan))
        {
            var resolved = _config.ResolvePosition(schemaSpan);
            edits.Add(
                new ReplaceEdit(
                    resolved,
                    CaptureInnerText(resolved),
                    System.Text.Json.JsonSerializer.Serialize(newLeaf)
                )
            );
        }

        foreach (var r in model.Refs.DataModel)
        {
            string? value = null;
            if (string.Equals(r.Value, oldPath, StringComparison.Ordinal))
                value = newPath;
            else if (r.Value.StartsWith(oldPath + ".", StringComparison.Ordinal))
                value = newPath + r.Value[oldPath.Length..];
            if (value is not null)
            {
                var resolved = _config.ResolvePosition(r.Position);
                edits.Add(
                    new ReplaceEdit(
                        resolved,
                        CaptureInnerText(resolved),
                        System.Text.Json.JsonSerializer.Serialize(value)
                    )
                );
            }
        }
        return edits;
    }

    public RenamePrepare? PrepareRename(string file, int line, int col)
    {
        if (
            SymbolAt(_config.Current, file, line, col) is not { } sym
            || sym.Kind is SymbolKind.OptionsId or SymbolKind.LayoutSet or SymbolKind.CSharpClass
        )
            return null;
        if (_config.ResolveNodeAt(file, line, col) is not { } node)
            return null;
        if (sym.Kind == SymbolKind.Page && node.Pointer.Length == 0)
            return null;

        var innerEnd = node.EndColumn - 1;
        if (sym.Kind == SymbolKind.DataModelPath)
        {
            var segment = LeafOf(sym.Value);
            var valueBytes = Encoding.UTF8.GetByteCount(sym.Value);
            var segmentBytes = Encoding.UTF8.GetByteCount(segment);
            var startCol = node.Key ? node.Column + 1 : node.Column + 1 + (valueBytes - segmentBytes);
            var endCol = node.Key ? innerEnd : node.Column + 1 + valueBytes;
            return new RenamePrepare(new SourceSpan(node.File, "", node.Line, startCol, node.EndLine, endCol), segment);
        }
        return new RenamePrepare(
            new SourceSpan(node.File, "", node.Line, node.Column + 1, node.EndLine, innerEnd),
            sym.Value
        );
    }

    private static string LeafOf(string path)
    {
        var dot = path.LastIndexOf('.');
        return dot < 0 ? path : path[(dot + 1)..];
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
