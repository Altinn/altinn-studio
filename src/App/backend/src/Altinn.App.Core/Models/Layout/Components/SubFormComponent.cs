using System.Diagnostics;
using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component for handling subforms
/// </summary>
public sealed class SubFormComponent : Base.BaseComponent
{
    /// <summary>Constructor</summary>
    /// <remarks>
    /// Note that some properties are commented out, as they are currently not used, and might allow expressions in the future
    /// </remarks>
    public static SubFormComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        if (
            !componentElement.TryGetProperty("layoutSet", out JsonElement layoutSetIdElement)
            || layoutSetIdElement.ValueKind != JsonValueKind.String
        )
        {
            throw new ArgumentException("SubFormComponent must have a string 'layoutSet' property.");
        }
        var layoutSetId = layoutSetIdElement.GetString() ?? throw new UnreachableException();

        return new SubFormComponent()
        {
            // BaseComponent properties
            Id = ParseId(componentElement),
            Type = ParseType(componentElement),
            PageId = pageId,
            LayoutId = layoutId,
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = ParseDataModelBindings(componentElement),
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // SubFormComponent properties
            LayoutSetId = layoutSetId,
        };
    }

    /// <summary>
    /// The layout set to load for this subform
    /// </summary>
    public required string LayoutSetId { get; init; }

    /// <inheritdoc />
    public override async Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    )
    {
        if (!layoutsLookup.TryGetValue(LayoutSetId, out var layoutSet))
        {
            throw new ArgumentException(
                $"SubFormComponent {Id} is configured to use Layout set {LayoutSetId}, but it was not found."
            );
        }

        List<ComponentContext> childContexts = [];
        foreach (
            DataElementIdentifier dataElement in state.Instance.Data.Where(d =>
                d.DataType == layoutSet.DefaultDataType.Id
            )
        )
        {
            // Currently, we just add all pages flat into the subform component.
            // We don't have any need for a "SubFormRow" context.
            foreach (var subformPage in layoutSet.Pages)
            {
                childContexts.Add(await subformPage.GetContext(state, dataElement, null, layoutsLookup));
            }
        }

        return new ComponentContext(state, this, rowIndexes, defaultDataElementIdentifier, childContexts);
    }

    /// <inheritdoc />
    public override void ClaimChildren(
        Dictionary<string, Base.BaseComponent> unclaimedComponents,
        Dictionary<string, string> claimedComponents
    )
    {
        // Sub form does not claim children from the same layout
    }
}
