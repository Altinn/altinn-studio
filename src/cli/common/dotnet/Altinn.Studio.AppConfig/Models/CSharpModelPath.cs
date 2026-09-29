using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

internal static class CSharpModelPath
{
    public static SourceSpan? Resolve(
        IReadOnlyDictionary<string, ModelTypeInfo> model,
        string rootClassRef,
        string dottedPath
    )
    {
        if (string.IsNullOrEmpty(dottedPath))
            return null;
        ModelTypeInfo? current = Lookup(model, rootClassRef);
        SourceSpan? span = null;
        foreach (var rawSegment in dottedPath.Split('.'))
        {
            if (current is null)
                return null;
            var name = StripIndex(rawSegment);
            var prop = current.Properties.FirstOrDefault(p =>
                string.Equals(p.JsonName, name, StringComparison.Ordinal)
            );
            if (prop is null)
                return null;
            span = prop.Span;
            var next = prop.Type.Collection == CollectionKind.Scalar ? prop.Type.Name : prop.Type.ElementType?.Name;
            current = next is null ? null : Lookup(model, next);
        }
        return span;
    }

    public static string? PathToCursor(
        IReadOnlyDictionary<string, ModelTypeInfo> model,
        string rootClassRef,
        string file,
        int line
    )
    {
        var root = Lookup(model, rootClassRef);
        return root is null ? null : Search(model, root, "", file, line, new HashSet<string>(StringComparer.Ordinal));
    }

    private static string? Search(
        IReadOnlyDictionary<string, ModelTypeInfo> model,
        ModelTypeInfo type,
        string prefix,
        string file,
        int line,
        HashSet<string> visited
    )
    {
        if (!visited.Add(type.FullyQualifiedName))
            return null;
        foreach (var p in type.Properties)
        {
            var path = prefix.Length == 0 ? p.JsonName : prefix + "." + p.JsonName;
            if (Covers(p.Span, file, line))
                return path;
            var typeName = p.Type.Collection == CollectionKind.Scalar ? p.Type.Name : p.Type.ElementType?.Name;
            if (
                typeName is not null
                && Lookup(model, typeName) is { } next
                && Search(model, next, path, file, line, visited) is { } deeper
            )
                return deeper;
        }
        visited.Remove(type.FullyQualifiedName);
        return null;
    }

    private static bool Covers(SourceSpan? span, string file, int line)
    {
        if (span is not { } s || !string.Equals(s.File, file, StringComparison.Ordinal) || line < s.Line)
            return false;
        return s.EndLine > 0 ? line <= s.EndLine : line == s.Line;
    }

    private static ModelTypeInfo? Lookup(IReadOnlyDictionary<string, ModelTypeInfo> model, string typeName)
    {
        if (model.TryGetValue(typeName, out var exact))
            return exact;
        foreach (var (key, info) in model)
            if (key.EndsWith("." + typeName, StringComparison.Ordinal))
                return info;
        return null;
    }

    private static string StripIndex(string segment)
    {
        var bracket = segment.IndexOf('[');
        return bracket < 0 ? segment : segment[..bracket];
    }
}
