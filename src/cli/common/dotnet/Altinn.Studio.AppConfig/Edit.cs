using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig;

public abstract record Edit
{
    private protected Edit() { }
}

public sealed record ReplaceEdit(SourceSpan Span, string OldValue, string NewValue) : Edit;

public sealed record RenameFileEdit(string OldPath, string NewPath) : Edit;
