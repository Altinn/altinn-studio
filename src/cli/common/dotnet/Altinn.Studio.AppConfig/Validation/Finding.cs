using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation;

public sealed record Finding(string RuleId, string Message, Severity Severity, SourceSpan Position)
{
    public override string ToString() => $"{Severity.ToToken()}: [{RuleId}] {Message} ({Position})";
}
