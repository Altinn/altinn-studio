using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Cross;

internal sealed class GroupChildPageRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "CROSS-GROUP-CHILD-PAGE",
            "Group children must be declared on the group's own page",
            "A Group/RepeatingGroup renders its children inside the group on the same page, "
                + "so each child must be declared in the same layout file. A child that exists "
                + "elsewhere in the layout-set resolves by id but never renders in the group. "
                + "A repeated id resolves to the component the frontend keeps (see "
                + "UNIQUE-COMPONENT-ID), and a group the frontend removes as a duplicate is not checked.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var (set, parent) in app.ComponentsOfType("Group", "RepeatingGroup"))
        {
            if (set.IsRemovedDuplicate(parent))
                continue;
            for (var i = 0; i < parent.Children.Count; i++)
            {
                // Missing children are REF-LAYOUT-COMPONENT-ID's job; here we only care
                // about children that exist but live on a different page.
                if (
                    !set.Components.TryGetValue(parent.Children[i], out var child)
                    || string.Equals(child.Page, parent.Page, StringComparison.Ordinal)
                )
                    continue;
                yield return Metadata.Report(
                    RemovedFromGroupPage(set, child, parent.Page)
                        ? $"child \"{child.Id}\" of {parent.Type} \"{parent.Id}\" is first declared on page "
                            + $"\"{child.Page}\"; the frontend removes its declaration on the group's page "
                            + $"\"{parent.Page}\" as a duplicate"
                        : $"child \"{child.Id}\" of {parent.Type} \"{parent.Id}\" is declared on page "
                            + $"\"{child.Page}\", not the group's page \"{parent.Page}\"",
                    parent.Position.Child("children").Child(i)
                );
            }
        }
    }

    private static bool RemovedFromGroupPage(LayoutSet set, LayoutComponent child, string groupPage) =>
        set.AllComponents.Any(c =>
            string.Equals(c.Id, child.Id, StringComparison.Ordinal)
            && string.Equals(c.Page, groupPage, StringComparison.Ordinal)
        );
}
