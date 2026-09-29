using System.Diagnostics.CodeAnalysis;
using System.Text;
using System.Text.Json;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfigLsp;

/// <summary>
/// The symbol-backed requests: hover, definition/references, completion, rename,
/// code actions, and code lenses. Callers hold the server's handler lock.
/// </summary>
internal sealed class LanguageFeatures(
    WorkspaceState workspace,
    LspConversions convert,
    DiagnosticsPublisher diagnostics
)
{
    // Shared prologue of every engine-reading request: flush pending validation (answer against
    // the latest buffer, not the debounce-pending state), ensure the engine, and resolve the
    // request's document. False when the engine isn't ready or the URI is outside the app.
    private bool TryResolveRequest(
        TextDocumentIdentifier? textDocument,
        [NotNullWhen(true)] out string? rel,
        [NotNullWhen(true)] out AppSymbols? symbols
    )
    {
        diagnostics.Flush();
        workspace.EnsureEngine();
        rel = workspace.ToRelative(textDocument?.Uri);
        symbols = workspace.Symbols;
        return rel is not null && symbols is not null;
    }

    public IReadOnlyList<SourceSpan> Navigate(
        TextDocumentPositionParams p,
        Func<AppSymbols, string, int, int, IReadOnlyList<SourceSpan>> query
    )
    {
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return Array.Empty<SourceSpan>();
        var (line1, byteCol) = convert.CursorOf(p.Position, rel);
        return query(symbols, rel, line1, byteCol);
    }

    public CompletionList OnCompletion(TextDocumentPositionParams p)
    {
        var items = new List<CompletionItem>();
        if (TryResolveRequest(p.TextDocument, out var rel, out var symbols))
        {
            var (line1, byteCol) = convert.CursorOf(p.Position, rel);
            foreach (var s in symbols.Completions(rel, line1, byteCol))
            {
                items.Add(
                    new CompletionItem(
                        s.Label,
                        s.Detail,
                        // LSP CompletionItemKind: Field=5, Class=7, File=17, Reference=18, EnumMember=20, Constant=21.
                        s.Kind switch
                        {
                            SuggestionKind.DataModelPath => 5,
                            SuggestionKind.DataType => 7,
                            SuggestionKind.Component => 18,
                            SuggestionKind.Page => 17,
                            SuggestionKind.Task => 20,
                            SuggestionKind.OptionsId => 17,
                            _ => 21,
                        }
                    )
                );
            }
        }
        return new CompletionList(IsIncomplete: false, items);
    }

    // Rename the symbol under the cursor everywhere: a WorkspaceEdit replacing each
    // token with its (JSON-quoted) new value. Null when nothing renameable.
    public WorkspaceEdit? OnRename(RenameParams p)
    {
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return null;
        var newName = p.NewName ?? "";
        if (newName.Length == 0)
            return null;

        var (line1, byteCol) = convert.CursorOf(p.Position, rel);
        var edits = symbols.ProposeRename(rel, line1, byteCol, newName);
        if (edits.Count == 0)
            return null;

        // A rename that also moves files needs the documentChanges form: text edits first
        // (on the pre-rename URIs), then the RenameFile operations.
        var textByUri = new Dictionary<string, List<TextEdit>>(StringComparer.Ordinal);
        var renames = new List<object>();
        foreach (var e in edits)
        {
            switch (e)
            {
                case ReplaceEdit re:
                    var uri = workspace.ToUri(re.Span.File);
                    if (!textByUri.TryGetValue(uri, out var list))
                        textByUri[uri] = list = new List<TextEdit>();
                    // ReplaceEdit.NewValue is the literal splice text (already JSON-quoted for a string token).
                    list.Add(new TextEdit(convert.LspRange(re.Span), re.NewValue));
                    break;
                case RenameFileEdit mv:
                    renames.Add(
                        new RenameFile(
                            workspace.ToUri(mv.OldPath),
                            workspace.ToUri(mv.NewPath),
                            new RenameFileOptions(Overwrite: false, IgnoreIfExists: false)
                        )
                    );
                    break;
            }
        }
        if (renames.Count == 0)
            return new WorkspaceEdit(Changes: textByUri);
        var documentChanges = new List<object>();
        foreach (var kv in textByUri)
            documentChanges.Add(
                new TextDocumentEdit(new OptionalVersionedTextDocumentIdentifier(kv.Key, Version: null), kv.Value)
            );
        documentChanges.AddRange(renames);
        return new WorkspaceEdit(DocumentChanges: documentChanges);
    }

    // The command is registered client-side by the VS Code extension.
    public List<CodeLens> OnCodeLenses(CodeLensParams p)
    {
        var lenses = new List<CodeLens>();
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return lenses;
        var uri = workspace.ToUri(rel);
        foreach (var lens in symbols.CodeLenses(rel))
        {
            lenses.Add(
                new CodeLens(
                    convert.LspRange(lens.Range),
                    new Command(
                        lens.Title,
                        "altinnAppConfig.showReferences",
                        [
                            uri,
                            convert.LspStart(lens.Range),
                            lens
                                .Locations.Select(l => new Location(workspace.ToUri(l.File), convert.LspRange(l)))
                                .ToList(),
                        ]
                    )
                )
            );
        }
        return lenses;
    }

    public List<CodeAction> OnCodeActions(CodeActionParams p)
    {
        var actions = new List<CodeAction>();
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return actions;
        var uri = p.TextDocument.Uri;
        if (uri is null || p.Context?.Diagnostics is not { } diags)
            return actions;

        foreach (var d in diags)
        {
            if (d.Source != "altinn-appconfig" || d.Range is null)
                continue;
            var start = d.Range.Start;
            // `start` is UTF-16 (from our own publish); convert back to a byte column.
            var suggestion = symbols.SuggestCorrection(rel, start.Line + 1, convert.InputByteColumn(rel, start));
            if (suggestion is null)
                continue;
            actions.Add(
                new CodeAction(
                    $"Change to \"{suggestion}\"",
                    "quickfix",
                    [d],
                    IsPreferred: true,
                    new WorkspaceEdit(
                        Changes: new Dictionary<string, List<TextEdit>>
                        {
                            [uri] = [new TextEdit(d.Range, JsonSerializer.Serialize(suggestion))],
                        }
                    )
                )
            );
        }
        return actions;
    }

    public PrepareRenameResult? OnPrepareRename(TextDocumentPositionParams p)
    {
        if (!TryResolveRequest(p.TextDocument, out var rel, out var symbols))
            return null;
        var (line1, byteCol) = convert.CursorOf(p.Position, rel);
        if (symbols.PrepareRename(rel, line1, byteCol) is not { } pr)
            return null;
        return new PrepareRenameResult(convert.LspRange(pr.Range), pr.Placeholder);
    }

    public Hover? OnHover(TextDocumentPositionParams p)
    {
        diagnostics.Flush(); // answer against the latest buffer, not the debounce-pending state
        var rel = workspace.ToRelative(p.TextDocument.Uri);
        if (rel is null || workspace.Engine is not { } engine)
            return null;
        var byteCol = convert.InputByteColumn(rel, p.Position);
        if (engine.ResolveNodeAt(rel, p.Position.Line + 1, byteCol) is not { } node)
            return null;

        var sb = new StringBuilder();
        if (workspace.Symbols?.SymbolHover(rel, p.Position.Line + 1, byteCol) is { } symbolCard)
        {
            sb.Append(symbolCard);
        }
        else
        {
            sb.Append('`').Append(string.IsNullOrEmpty(node.Pointer) ? "/" : node.Pointer).Append('`');
            if (node.Key)
                sb.Append(" _(property name)_");
        }
        return new Hover(new MarkupContent("markdown", sb.ToString()), convert.LspRange(node));
    }
}
