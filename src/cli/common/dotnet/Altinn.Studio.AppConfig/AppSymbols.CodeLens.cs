using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig;

public sealed partial class AppSymbols
{
    public IReadOnlyList<CodeLensItem> CodeLenses(string file)
    {
        var model = _config.Current;

        var byAnchor = new Dictionary<(int Line, int Column), (SourceSpan Range, List<SourceSpan> Locations)>();

        void Add(SourceSpan decl, IReadOnlyList<SourceSpan> uses)
        {
            if (uses.Count == 0)
                return;
            var resolved = ResolveSpan(decl);
            if (resolved.Line <= 0)
                return;
            if (!byAnchor.TryGetValue((resolved.Line, resolved.Column), out var lens))
                byAnchor[(resolved.Line, resolved.Column)] = lens = (resolved, new List<SourceSpan>());
            foreach (var u in uses)
                if (!lens.Locations.Contains(u))
                    lens.Locations.Add(u);
        }

        foreach (var (sym, decls) in model.SymbolTable.Declarations)
        {
            List<SourceSpan>? uses = null;
            foreach (var d in decls)
            {
                if (!string.Equals(d.File, file, StringComparison.Ordinal))
                    continue;
                uses ??= ReferenceSites(model, sym);
                Add(d, uses);
            }
        }

        if (file.EndsWith(".schema.json", StringComparison.Ordinal))
        {
            var dataType = DataTypeForSchemaFile(model, file);
            foreach (var (path, span) in model.SchemaPropertyPositions)
                if (string.Equals(span.File, file, StringComparison.Ordinal))
                    Add(span, ReferenceSites(model, new Symbol(SymbolKind.DataModelPath, path, dataType)));
        }
        else if (file.EndsWith(".cs", StringComparison.Ordinal))
        {
            var seenLines = new HashSet<int>();
            foreach (var info in model.CSharpModel.Values)
            {
                foreach (var prop in info.Properties)
                {
                    if (
                        prop.Span is not { } span
                        || !string.Equals(span.File, file, StringComparison.Ordinal)
                        || !seenLines.Add(span.Line)
                    )
                        continue;
                    foreach (var dt in model.DataTypes)
                    {
                        if (dt.ClassRef.Length == 0)
                            continue;
                        if (CSharpModelPath.PathToCursor(model.CSharpModel, dt.ClassRef, file, span.Line) is { } path)
                        {
                            Add(span, ReferenceSites(model, new Symbol(SymbolKind.DataModelPath, path, dt.Id)));
                            break;
                        }
                    }
                }
            }
        }

        return byAnchor
            .Values.OrderBy(l => l.Range.Line)
            .ThenBy(l => l.Range.Column)
            .Select(l => new CodeLensItem(
                l.Range,
                $"{l.Locations.Count} reference{(l.Locations.Count == 1 ? "" : "s")}",
                l.Locations
            ))
            .ToList();
    }
}

public sealed record CodeLensItem(SourceSpan Range, string Title, IReadOnlyList<SourceSpan> Locations);
