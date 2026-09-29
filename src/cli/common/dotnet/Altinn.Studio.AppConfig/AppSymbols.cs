using System.Text;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig;

public sealed partial class AppSymbols
{
    private readonly AppConfigEngine _config;

    public AppSymbols(AppConfigEngine config) => _config = config;

    public IReadOnlyList<SourceSpan> Definition(string file, int line, int col)
    {
        var model = _config.Current;
        return SymbolAt(model, file, line, col) is { } sym ? DefinitionsOf(model, sym) : Array.Empty<SourceSpan>();
    }

    public IReadOnlyList<SourceSpan> Definition(Symbol symbol) => DefinitionsOf(_config.Current, symbol);

    public IReadOnlyList<SourceSpan> References(string file, int line, int col, bool includeDeclaration)
    {
        var model = _config.Current;
        return SymbolAt(model, file, line, col) is { } sym
            ? References(model, sym, includeDeclaration)
            : Array.Empty<SourceSpan>();
    }

    public IReadOnlyList<SourceSpan> References(Symbol symbol, bool includeDeclaration) =>
        References(_config.Current, symbol, includeDeclaration);

    private IReadOnlyList<SourceSpan> References(AppModel model, Symbol symbol, bool includeDeclaration)
    {
        var result = ReferenceSites(model, symbol);
        if (includeDeclaration)
            result.AddRange(DefinitionsOf(model, symbol));
        return result;
    }

    private Symbol? SymbolAt(AppModel model, string file, int line, int col)
    {
        var optionsId = Path.GetFileNameWithoutExtension(file);
        if (
            string.Equals(file, "App/options/" + optionsId + ".json", StringComparison.Ordinal)
            && model.OptionsFiles.ContainsKey(optionsId)
        )
            return new Symbol(SymbolKind.OptionsId, optionsId);

        if (file.EndsWith(".cs", StringComparison.Ordinal))
        {
            foreach (var dt in model.DataTypes)
                if (
                    dt.ClassRef.Length > 0
                    && CSharpModelPath.PathToCursor(model.CSharpModel, dt.ClassRef, file, line) is { } path
                )
                    return new Symbol(SymbolKind.DataModelPath, path, dt.Id);
            foreach (var (fqn, info) in model.CSharpModel)
                if (
                    info.Span is { } s
                    && string.Equals(s.File, file, StringComparison.Ordinal)
                    && line == s.Line
                    && col >= s.Column
                    && col < s.EndColumn
                )
                    return new Symbol(SymbolKind.CSharpClass, fqn);
            return null;
        }

        if (_config.ResolveNodeAt(file, line, col) is not { } node)
            return PageSymbolOf(model, file);
        var ptr = node.Pointer;

        foreach (var r in model.Refs.DataModel)
            if (Same(r.Position, file, ptr))
                return new Symbol(
                    SymbolKind.DataModelPath,
                    EffectivePath(r.Value, node, col),
                    BindingResolver.Resolve(model, r) ?? ""
                );
        foreach (var (path, span) in model.SchemaPropertyPositions)
            if (Same(span, file, ptr))
                return new Symbol(SymbolKind.DataModelPath, path, DataTypeForSchemaFile(model, file));

        if (model.SymbolTable.At(file, ptr) is { } sym)
            return sym;
        return ptr.Length == 0 ? PageSymbolOf(model, file) : null;
    }

    private static Symbol? PageSymbolOf(AppModel model, string file) =>
        model.LayoutFiles.Contains(file)
            ? new Symbol(SymbolKind.Page, Path.GetFileNameWithoutExtension(file), AppPaths.SetIdOf(file))
            : null;

    private IReadOnlyList<SourceSpan> DefinitionsOf(AppModel model, Symbol sym)
    {
        if (sym.Kind == SymbolKind.DataModelPath)
        {
            var result = new List<SourceSpan>();
            if (
                model.DataTypes.FirstOrDefault(d => string.Equals(d.Id, sym.Scope, StringComparison.Ordinal))
                    is { ClassRef.Length: > 0 } dt
                && CSharpModelPath.Resolve(model.CSharpModel, dt.ClassRef, sym.Value) is { } csharp
            )
                result.Add(csharp);
            if (model.SchemaPropertyPositions.TryGetValue(sym.Value, out var prop))
                result.Add(ResolveSpan(prop));
            return result;
        }
        return model.SymbolTable.DeclarationsOf(sym).Select(ResolveSpan).ToList();
    }

    private List<SourceSpan> ReferenceSites(AppModel model, Symbol sym)
    {
        if (sym.Kind == SymbolKind.DataModelPath)
        {
            var result = new List<SourceSpan>();
            foreach (var r in model.Refs.DataModel)
                if (
                    string.Equals(r.Value, sym.Value, StringComparison.Ordinal)
                    || r.Value.StartsWith(sym.Value + ".", StringComparison.Ordinal)
                )
                    result.Add(_config.ResolvePosition(r.Position));
            return result;
        }
        return model.SymbolTable.UsesOf(sym).Select(ResolveSpan).ToList();
    }

    private static string EffectivePath(string value, SourceSpan node, int col)
    {
        var byteOffset = Math.Max(0, col - (node.Column + 1));
        var charOffset = Math.Clamp(CharIndexAtByteOffset(value, byteOffset), 0, Math.Max(0, value.Length - 1));
        var dot = value.IndexOf('.', charOffset);
        return dot < 0 ? value : value[..dot];
    }

    private static int CharIndexAtByteOffset(string value, int byteOffset)
    {
        var bytes = 0;
        var chars = 0;
        foreach (var rune in value.EnumerateRunes())
        {
            if (bytes >= byteOffset)
                break;
            bytes += rune.Utf8SequenceLength;
            chars += rune.Utf16SequenceLength;
        }
        return chars;
    }

    private static string DataTypeForSchemaFile(AppModel model, string file)
    {
        foreach (var dt in model.DataTypes)
            if (string.Equals(AppPaths.SchemaFile(dt.Id), file, StringComparison.Ordinal))
                return dt.Id;
        return "";
    }

    private static bool Same(SourceSpan span, string file, string pointer) =>
        string.Equals(span.File, file, StringComparison.Ordinal)
        && string.Equals(span.Pointer, pointer, StringComparison.Ordinal);

    private SourceSpan ResolveSpan(SourceSpan span) =>
        string.IsNullOrEmpty(span.Pointer) ? span : _config.ResolvePosition(span);
}
