using System.Text.Json.Serialization;

namespace Altinn.Studio.AppConfigLsp;

public sealed record InitializeParams(
    string? RootUri = null,
    string? RootPath = null,
    WorkspaceFolder[]? WorkspaceFolders = null
);

public sealed record WorkspaceFolder(string? Uri = null, string? Name = null);

public sealed record WorkspaceFoldersChangeEvent(WorkspaceFolder[]? Added = null, WorkspaceFolder[]? Removed = null);

public sealed record DidChangeWorkspaceFoldersParams(WorkspaceFoldersChangeEvent? Event = null);

public sealed record WorkspaceFoldersServerCapabilities(bool Supported, bool ChangeNotifications);

public sealed record WorkspaceServerCapabilities(WorkspaceFoldersServerCapabilities WorkspaceFolders);

public sealed record ServerInfo(string Name);

public sealed record InitializeResult(ServerCapabilities Capabilities, ServerInfo ServerInfo);

public sealed record RenameProviderOptions(bool PrepareProvider);

public sealed record CompletionProviderOptions(string[]? TriggerCharacters = null);

public sealed record CodeActionProviderOptions(string[] CodeActionKinds);

public sealed record CodeLensProviderOptions(bool ResolveProvider);

public sealed record ServerCapabilities(
    int TextDocumentSync,
    bool HoverProvider,
    bool DefinitionProvider,
    bool ReferencesProvider,
    RenameProviderOptions RenameProvider,
    CompletionProviderOptions CompletionProvider,
    CodeActionProviderOptions CodeActionProvider,
    CodeLensProviderOptions CodeLensProvider,
    WorkspaceServerCapabilities? Workspace = null
);

public sealed record Position(int Line, int Character);

public sealed record Range(Position Start, Position End);

public sealed record Location(string Uri, Range Range);

public sealed record TextDocumentIdentifier(string? Uri = null);

public sealed record TextDocumentItem(string? Uri = null, string? Text = null);

public sealed record DidOpenTextDocumentParams(TextDocumentItem? TextDocument = null);

public sealed record TextDocumentContentChangeEvent(string? Text = null);

public sealed record DidChangeTextDocumentParams(
    TextDocumentIdentifier? TextDocument = null,
    TextDocumentContentChangeEvent[]? ContentChanges = null
);

public sealed record DidCloseTextDocumentParams(TextDocumentIdentifier? TextDocument = null);

public sealed record FileEvent(string? Uri = null, int Type = 0);

public sealed record DidChangeWatchedFilesParams(FileEvent[]? Changes = null);

public sealed record TextDocumentPositionParams(TextDocumentIdentifier TextDocument, Position Position);

public sealed record ReferenceContext(bool IncludeDeclaration = false);

public sealed record ReferenceParams(
    TextDocumentIdentifier TextDocument,
    Position Position,
    ReferenceContext? Context = null
);

public sealed record RenameParams(TextDocumentIdentifier TextDocument, Position Position, string? NewName = null);

public sealed record MarkupContent(string Kind, string Value);

public sealed record Hover(MarkupContent Contents, Range Range);

public sealed record CompletionList(bool IsIncomplete, IReadOnlyList<CompletionItem> Items);

public sealed record CompletionItem(string Label, string? Detail, int Kind);

public sealed record Diagnostic(Range Range, int Severity, string? Source, object? Code, string? Message);

public sealed record PublishDiagnosticsParams(string Uri, IReadOnlyList<Diagnostic> Diagnostics);

public sealed record ShowMessageParams(int Type, string Message);

public sealed record TextEdit(Range Range, string NewText);

public sealed record OptionalVersionedTextDocumentIdentifier(
    string Uri,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] int? Version
);

public sealed record TextDocumentEdit(
    OptionalVersionedTextDocumentIdentifier TextDocument,
    IReadOnlyList<TextEdit> Edits
);

public sealed record RenameFileOptions(bool Overwrite, bool IgnoreIfExists);

public sealed record RenameFile(string OldUri, string NewUri, RenameFileOptions Options)
{
    public string Kind => "rename";
}

public sealed record WorkspaceEdit(
    Dictionary<string, List<TextEdit>>? Changes = null,
    IReadOnlyList<object>? DocumentChanges = null
);

public sealed record PrepareRenameResult(Range Range, string Placeholder);

public sealed record CodeLensParams(TextDocumentIdentifier TextDocument);

public sealed record Command(string Title, [property: JsonPropertyName("command")] string Name, object[] Arguments);

public sealed record CodeLens(Range Range, Command Command);

public sealed record CodeActionContext(Diagnostic[]? Diagnostics = null);

public sealed record CodeActionParams(
    TextDocumentIdentifier TextDocument,
    Range? Range = null,
    CodeActionContext? Context = null
);

public sealed record CodeAction(
    string Title,
    string Kind,
    Diagnostic[] Diagnostics,
    bool IsPreferred,
    WorkspaceEdit Edit
);
