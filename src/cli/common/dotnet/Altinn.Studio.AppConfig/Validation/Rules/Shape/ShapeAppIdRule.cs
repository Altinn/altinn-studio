using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Shape;

internal sealed class ShapeAppIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "SHAPE-APP-ID",
            "applicationmetadata.id must be in <org>/<app> form",
            "applicationmetadata.id must match the form <org>/<app> where both segments "
                + "are lowercase alphanumerics and dashes. Other shapes break URL routing in the backend.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        if (string.IsNullOrEmpty(app.ApplicationId))
            yield break;
        if (AppIdConvention.Pattern.IsMatch(app.ApplicationId))
            yield break;
        yield return Metadata.Report(
            $"applicationmetadata.id \"{app.ApplicationId}\" is not in <org>/<app> form (lowercase alphanumerics + dashes)",
            new SourceSpan("App/config/applicationmetadata.json", "/id")
        );
    }
}
