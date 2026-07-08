using System.Globalization;
using System.Text.Json;

namespace Altinn.Studio.AppConfig.Documents.Text;

internal readonly record struct PointerSpan(
    int Line,
    int Col,
    int EndLine,
    int EndCol,
    int KeyLine = 0,
    int KeyCol = 0,
    int KeyEndLine = 0,
    int KeyEndCol = 0
);

internal static class JsonPositions
{
    public static IReadOnlyDictionary<string, PointerSpan> Build(byte[] json)
    {
        var map = new Dictionary<string, PointerSpan>(StringComparer.Ordinal);
        var newlines = NewlineOffsets(json);
        var reader = new Utf8JsonReader(
            json,
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        var frames = new Stack<Frame>();
        var pending = "";
        (int Line, int Col, int EndLine, int EndCol) pendingKey = default;
        try
        {
            while (reader.Read())
            {
                switch (reader.TokenType)
                {
                    case JsonTokenType.PropertyName:
                    {
                        pending = frames.Peek().Base + "/" + JsonPointerEscaping.Escape(reader.GetString() ?? "");
                        var (keyLine, keyCol) = LineCol(newlines, reader.TokenStartIndex);
                        var keyEnd = reader.TokenStartIndex + reader.ValueSpan.Length + 2;
                        var (keyEndLine, keyEndCol) = LineCol(newlines, keyEnd);
                        pendingKey = (keyLine, keyCol, keyEndLine, keyEndCol);
                        break;
                    }
                    case JsonTokenType.StartObject:
                    case JsonTokenType.StartArray:
                    {
                        var ptr = Next(frames, pending);
                        var (line, col) = LineCol(newlines, reader.TokenStartIndex);
                        map[ptr] = new PointerSpan(
                            line,
                            col,
                            line,
                            col,
                            pendingKey.Line,
                            pendingKey.Col,
                            pendingKey.EndLine,
                            pendingKey.EndCol
                        );
                        pendingKey = default;
                        frames.Push(new Frame(ptr, reader.TokenType == JsonTokenType.StartArray));
                        break;
                    }
                    case JsonTokenType.EndObject:
                    case JsonTokenType.EndArray:
                        if (frames.Count > 0)
                        {
                            var frame = frames.Pop();
                            if (map.TryGetValue(frame.Base, out var start))
                            {
                                var (endLine, endCol) = LineCol(newlines, reader.BytesConsumed);
                                map[frame.Base] = start with { EndLine = endLine, EndCol = endCol };
                            }
                        }
                        break;
                    case JsonTokenType.String:
                    case JsonTokenType.Number:
                    case JsonTokenType.True:
                    case JsonTokenType.False:
                    case JsonTokenType.Null:
                    {
                        var (line, col) = LineCol(newlines, reader.TokenStartIndex);
                        // BytesConsumed = the value's exclusive end.
                        var (endLine, endCol) = LineCol(newlines, reader.BytesConsumed);
                        map[Next(frames, pending)] = new PointerSpan(
                            line,
                            col,
                            endLine,
                            endCol,
                            pendingKey.Line,
                            pendingKey.Col,
                            pendingKey.EndLine,
                            pendingKey.EndCol
                        );
                        pendingKey = default;
                        break;
                    }
                }
            }
        }
        catch (JsonException)
        {
            // Malformed tail — keep the partial index.
        }
        return map;
    }

    /// <summary>The most specific pointer whose value — or key — span contains (line, col), 1-based,
    /// end exclusive; <c>OnKey</c> when the point fell on the key token. Null when none does.</summary>
    public static (string Pointer, bool OnKey)? FindAt(
        IReadOnlyDictionary<string, PointerSpan> index,
        int line,
        int col
    )
    {
        string? best = null;
        var bestKey = false;
        (int Line, int Col) bestStart = (int.MinValue, int.MinValue);
        foreach (var (pointer, s) in index)
        {
            if (
                s.KeyLine > 0
                && Within(s.KeyLine, s.KeyCol, s.KeyEndLine, s.KeyEndCol, line, col)
                && After(s.KeyLine, s.KeyCol, bestStart)
            )
            {
                best = pointer;
                bestKey = true;
                bestStart = (s.KeyLine, s.KeyCol);
            }
            if (Within(s.Line, s.Col, s.EndLine, s.EndCol, line, col) && After(s.Line, s.Col, bestStart))
            {
                best = pointer;
                bestKey = false;
                bestStart = (s.Line, s.Col);
            }
        }
        return best is null ? null : (best, bestKey);
    }

    // (line, col) within [start, end) — lexicographic, 1-based, end exclusive.
    private static bool Within(int sl, int sc, int el, int ec, int line, int col)
    {
        var afterStart = line > sl || (line == sl && col >= sc);
        var beforeEnd = line < el || (line == el && col < ec);
        return afterStart && beforeEnd;
    }

    // A later-starting containing span is the more specific node.
    private static bool After(int line, int col, (int Line, int Col) best) =>
        line > best.Line || (line == best.Line && col > best.Col);

    private static string Next(Stack<Frame> frames, string pending)
    {
        if (frames.Count == 0)
            return "";
        var f = frames.Peek();
        if (!f.IsArray)
            return pending;
        var ptr = f.Base + "/" + f.Index.ToString(CultureInfo.InvariantCulture);
        f.Index++;
        return ptr;
    }

    private static long[] NewlineOffsets(byte[] json)
    {
        var list = new List<long>();
        for (long i = 0; i < json.Length; i++)
        {
            if (json[i] == (byte)'\n')
                list.Add(i);
        }
        return list.ToArray();
    }

    private static (int Line, int Col) LineCol(long[] newlines, long offset)
    {
        int lo = 0,
            hi = newlines.Length;
        while (lo < hi)
        {
            var mid = (lo + hi) / 2;
            if (newlines[mid] < offset)
                lo = mid + 1;
            else
                hi = mid;
        }
        var lineStart = lo == 0 ? 0 : newlines[lo - 1] + 1;
        return (lo + 1, (int)(offset - lineStart) + 1);
    }

    private sealed class Frame(string @base, bool isArray)
    {
        public string Base { get; } = @base;
        public bool IsArray { get; } = isArray;
        public int Index { get; set; }
    }
}
