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
                + "read when it is a string literal, a string constant or nameof(…). When the app "
                + "registers an options provider whose id can't be read that way (computed at runtime, "
                + "or a provider class from a package), a missing optionsId may come from it, so the "
                + "finding is reported as info and names those providers. Like the app runtime, an id "
                + "registered in code matches regardless of case, while an options file name must "
                + "match exactly.",
            Severity.Warning
        );

    private const int MaxNamedProviders = 3;

    public IEnumerable<Finding> Check(AppModel app)
    {
        var unreadable = UnreadableProviders(app);
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.OptionsId))
        {
            var missing =
                $"optionsId \"{u.Value}\" has no App/options/{u.Value}.json and no option list registered in code";
            yield return unreadable is null
                ? Metadata.Report(missing, u.Position)
                : Metadata.Report(
                    $"{missing} with that id, but it may come from {unreadable}, whose id can't be read from the code",
                    u.Position,
                    Severity.Info
                );
        }
    }

    private static string? UnreadableProviders(AppModel app)
    {
        var names = app
            .OptionsProvidersWithUnknownId.Select(p => $"{p.RegisteredBy} ({p.Position.File})")
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (names.Count == 0)
            return null;
        var named = string.Join(", ", names.Take(MaxNamedProviders));
        return names.Count > MaxNamedProviders ? $"{named} and {names.Count - MaxNamedProviders} more" : named;
    }
}
