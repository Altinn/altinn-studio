using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Documents.Text;

internal sealed class PositionIndex
{
    private readonly Dictionary<string, (long Hash, IReadOnlyDictionary<string, PointerSpan> Index)> _positions = new(
        StringComparer.Ordinal
    );

    public SourceSpan Resolve(IAppDirectory dir, SourceSpan span)
    {
        if (
            span.Line > 0
            || string.IsNullOrEmpty(span.Pointer)
            || !span.File.EndsWith(".json", StringComparison.Ordinal)
        )
            return span;

        if (IndexFor(dir, span.File) is not { } index)
            return span;
        if (!index.TryGetValue(span.Pointer, out var ps))
            return span;
        if (span.Key && ps.KeyLine > 0)
            return span with
            {
                Line = ps.KeyLine,
                Column = ps.KeyCol,
                EndLine = ps.KeyEndLine,
                EndColumn = ps.KeyEndCol,
            };
        return span with { Line = ps.Line, Column = ps.Col, EndLine = ps.EndLine, EndColumn = ps.EndCol };
    }

    public SourceSpan? NodeAt(IAppDirectory dir, string file, int line, int col)
    {
        if (!file.EndsWith(".json", StringComparison.Ordinal))
            return null;
        if (IndexFor(dir, file) is not { } index)
            return null;
        if (JsonPositions.FindAt(index, line, col) is not { } hit)
            return null;
        return Resolve(dir, new SourceSpan(file, hit.Pointer, Key: hit.OnKey));
    }

    private IReadOnlyDictionary<string, PointerSpan>? IndexFor(IAppDirectory dir, string file)
    {
        var handle = FileHandle.Read(dir, file);
        if (handle.Bytes is not { } bytes)
            return null;
        if (!_positions.TryGetValue(file, out var cached) || cached.Hash != handle.Hash)
        {
            cached = (handle.Hash, JsonPositions.Build(bytes));
            _positions[file] = cached;
        }
        return cached.Index;
    }
}
