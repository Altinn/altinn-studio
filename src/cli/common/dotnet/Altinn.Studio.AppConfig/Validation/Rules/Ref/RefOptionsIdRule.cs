using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefOptionsIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-OPTIONS-ID",
            "optionsId must reference an option source",
            "Dropdown/Checkboxes/RadioButtons optionsId must reference either a static "
                + "App/options/<id>.json file or a code-registered IAppOptionsProvider. "
                + "C# providers are detected when their Id is a string literal; an Id "
                + "computed at runtime can't be seen, so severity stays a warning.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.OptionsId))
            yield return Metadata.Report(
                $"optionsId \"{u.Value}\" has no App/options/{u.Value}.json or IAppOptionsProvider",
                u.Position
            );
    }
}
