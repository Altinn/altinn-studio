using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfigLsp;

/// <summary>
/// Converts between the engine's coordinates (1-based lines, 1-based UTF-8 byte columns,
/// workspace-relative paths) and the LSP's (0-based lines, 0-based UTF-16 characters, URIs).
/// </summary>
internal sealed class LspConversions(WorkspaceState workspace)
{
    // An LSP request's 0-based (line, character[UTF-16]) → the engine's 1-based (line, byte column).
    public int InputByteColumn(string? rel, Position position) =>
        workspace.MapperFor(rel)?.ToByteColumn(position.Line, position.Character) ?? position.Character + 1;

    // The request's 0-based cursor as the engine's 1-based line + byte column.
    public (int Line1, int ByteCol) CursorOf(Position position, string rel) =>
        (position.Line + 1, InputByteColumn(rel, position));

    // Engine columns are 1-based UTF-8 bytes (end exclusive); LSP characters are 0-based UTF-16.
    public Range LspRange(SourceSpan pos)
    {
        var map = workspace.MapperFor(pos.File);
        var start = LspStart(pos);
        var endLine = pos.EndLine > 0 ? pos.EndLine - 1 : start.Line;
        var endCh = ToUtf16Column(map, pos.EndLine, pos.EndColumn, fallback: start.Character + 1);
        return new Range(start, new Position(endLine, endCh));
    }

    public Position LspStart(SourceSpan pos)
    {
        var map = workspace.MapperFor(pos.File);
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

    public Diagnostic ToDiagnostic(Finding f, SourceSpan pos) =>
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

    public List<Location> Locations(IReadOnlyList<SourceSpan> spans)
    {
        var list = new List<Location>(spans.Count);
        foreach (var s in spans)
            list.Add(new Location(workspace.ToUri(s.File), LspRange(s)));
        return list;
    }
}
