using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Shape;

internal sealed class SelectionOptionsRule : IValidationRule
{
    private static readonly HashSet<string> _selectionTypes = new(StringComparer.Ordinal)
    {
        "Checkboxes",
        "Dropdown",
        "Likert",
        "LikertItem",
        "List",
        "MultipleSelect",
        "Option",
        "RadioButtons",
    };

    public RuleMetadata Metadata { get; } =
        new(
            "SELECTION-OPTIONS",
            "Selection components must declare an options source",
            "Checkboxes, Dropdown, Likert, LikertItem, List, MultipleSelect, Option and RadioButtons render their choices from "
                + "an optionsId, an inline options array, or a source binding. With none declared "
                + "the component shows no choices. Warning, because a custom setup could supply "
                + "options another way.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var (_, comp) in app.AllComponentsWithSet())
        {
            if (!_selectionTypes.Contains(comp.Type) || comp.HasOptionSource)
                continue;
            yield return Metadata.Report(
                $"{comp.Type} \"{comp.Id}\" has no options source (optionsId, options, or source)",
                comp.Position
            );
        }
    }
}
