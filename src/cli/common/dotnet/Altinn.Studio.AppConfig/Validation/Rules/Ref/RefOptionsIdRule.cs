using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefOptionsIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-OPTIONS-ID",
            "optionsId must reference an option source",
            "Dropdown/Checkboxes/RadioButtons optionsId must reference a static "
                + "App/options/<id>.json file, a shared library code list "
                + "(lib**<org>**<codeListId>**<version>), or an option list registered in code: an "
                + "IAppOptionsProvider class, AddAltinnCodelists() and the other Altinn.Codelists "
                + "helpers, AddSSBClassificationCodelistProvider(id, …), AddJoinedAppOptions(id, …), "
                + "AddAltinn2CodeList(id, …) or AddAltinn3CodeList(optionId, …). An id in code is "
                + "read when it is a string literal, a string constant or nameof(…); an id computed "
                + "at runtime can't be seen, so severity stays a warning. Like the app runtime, an id "
                + "registered in code matches regardless of case, while an options file name must "
                + "match exactly.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.OptionsId))
            yield return Metadata.Report(
                $"optionsId \"{u.Value}\" has no App/options/{u.Value}.json and no option list registered in code",
                u.Position
            );
    }
}
