using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Meta;

internal sealed class SyntaxValidRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "SYNTAX-VALID",
            "Every config file must be well-formed JSON/XML",
            "applicationmetadata.json, layout JSONs, Settings.json, model schemas, "
                + "text resources, process.bpmn and policy.xml must parse as well-formed "
                + "JSON/XML. A malformed file cannot be loaded, so its bindings, pages and "
                + "references go unchecked until the syntax error is fixed.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var e in app.ParseErrors)
            yield return Metadata.Report(e.Message, e.Position);
    }
}
