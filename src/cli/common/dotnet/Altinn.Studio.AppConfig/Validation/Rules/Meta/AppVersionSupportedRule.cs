using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Meta;

internal sealed class AppVersionSupportedRule : IValidationRule
{
    public const string RuleId = "APP-VERSION-SUPPORTED";

    public RuleMetadata Metadata { get; } =
        new(
            RuleId,
            "App must target Altinn.App v9",
            "This engine models the v9 app conventions (one layout-set folder per process task; "
                + "layout-sets.json is derived, not authoritative). Against an app that declares a "
                + "pre-v9 Altinn.App package — or whose version cannot be resolved at all — the "
                + "conventions can't be assumed, so every other check would produce misleading "
                + "findings; the build stops at this single error instead. Version resolution is "
                + "best-effort: a literal PackageReference version, a $(Property) defined in the "
                + "same csproj, a Directory.Packages.props entry, or a ProjectReference to the "
                + "Altinn.App sources (a source build is the current version). Only a directory "
                + "without App/App.csproj passes unchecked — nothing there claims a version.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        if (app.UnsupportedAppVersion is { } v)
            yield return Metadata.Report(
                $"{v.Reason}; this tool supports Altinn.App v9 apps only. To upgrade the app, try `studioctl app upgrade`.",
                v.Position
            );
    }
}
