using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Validation;

public sealed record RuleMetadata(string Id, string Title, string Description, Severity DefaultSeverity)
{
    public Finding Report(string message, SourceSpan at, Severity severity = Severity.None) =>
        new(Id, message, severity, at);
}
