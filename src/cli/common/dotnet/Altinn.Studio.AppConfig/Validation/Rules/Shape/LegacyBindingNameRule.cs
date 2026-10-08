using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Shape;

internal sealed class LegacyBindingNameRule : IValidationRule
{
    private static readonly IReadOnlyDictionary<string, string> _organizationLookupBindings = new Dictionary<
        string,
        string
    >(StringComparer.Ordinal)
    {
        ["organization_lookup_orgnr"] = "orgnr",
        ["organization_lookup_name"] = "name",
        ["organisation_lookup_orgnr"] = "orgnr",
        ["organisation_lookup_name"] = "name",
    };

    private static readonly IReadOnlyDictionary<string, string> _personLookupBindings = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["person_lookup_ssn"] = "ssn",
        ["person_lookup_name"] = "fullName",
        ["person_lookup_first_name"] = "firstName",
        ["person_lookup_middle_name"] = "middleName",
        ["person_lookup_last_name"] = "lastName",
    };

    private static readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> _dataModelBindings =
        new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal)
        {
            ["OrganizationLookup"] = _organizationLookupBindings,
            ["OrganisationLookup"] = _organizationLookupBindings,
            ["PersonLookup"] = _personLookupBindings,
        };

    private static readonly IReadOnlyDictionary<string, string> _repeatingGroupTextBindings = new Dictionary<
        string,
        string
    >(StringComparer.Ordinal)
    {
        ["add_button_full"] = "addButtonFull",
        ["add_button"] = "addButton",
        ["save_button"] = "saveButton",
        ["save_and_next_button"] = "saveAndNextButton",
        ["edit_button_close"] = "editButtonClose",
        ["edit_button_open"] = "editButtonOpen",
        ["pagination_next_button"] = "paginationNextButton",
        ["pagination_back_button"] = "paginationBackButton",
        ["multipage_back_button"] = "multipageBackButton",
        ["multipage_next_button"] = "multipageNextButton",
    };

    public RuleMetadata Metadata { get; } =
        new(
            "LEGACY-BINDING-NAME",
            "Binding names must use their v9 camelCase spelling",
            "Frontend v9 renamed the snake_case binding names of OrganizationLookup and PersonLookup "
                + "dataModelBindings and of RepeatingGroup textResourceBindings to camelCase and no "
                + "longer reads the old names. A binding under its v8 name is silently ignored, so the "
                + "component loses its data or its text.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var binding in app.Refs.DataModel)
        {
            if (
                _dataModelBindings.TryGetValue(binding.OwningComponentType, out var renames)
                && renames.TryGetValue(binding.BindingName, out var modern)
            )
                yield return Metadata.Report(
                    $"dataModelBindings.{binding.BindingName} on {binding.OwningComponentType} \"{binding.OwningComponentId}\" is the v8 name; v9 reads \"{modern}\"",
                    binding.Position
                );
        }

        var repeatingGroups = new HashSet<string>(
            app.ComponentsOfType("RepeatingGroup").Select(pair => pair.Component.Id),
            StringComparer.Ordinal
        );
        foreach (var text in app.Refs.TextResources)
        {
            if (
                repeatingGroups.Contains(text.OwningComponentId)
                && _repeatingGroupTextBindings.TryGetValue(text.BindingName, out var modern)
            )
                yield return Metadata.Report(
                    $"textResourceBindings.{text.BindingName} on RepeatingGroup \"{text.OwningComponentId}\" is the v8 name; v9 reads \"{modern}\"",
                    text.Position
                );
        }
    }
}
