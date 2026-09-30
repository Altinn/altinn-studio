using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Meta;

internal sealed class DeprecatedConfigRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "DEPRECATED-CONFIG",
            "Configuration that v9 no longer reads",
            "The app still carries configuration that v8 read and v9 ignores: enablePdfCreation on a "
                + "dataType and the top-level eFormidling block in applicationmetadata.json, and the "
                + "mapping and bindingToShowInSummary layout properties. Nothing breaks, but the "
                + "settings do nothing and hide that the v9 replacement (a pdf or eFormidling service "
                + "task, queryParameters, summaryBinding) is missing.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var deprecated in app.Deprecations)
            yield return Metadata.Report(deprecated.Detail, deprecated.Position);
    }
}
