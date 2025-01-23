using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Utilities for using the expression results to do tasks in backend
/// </summary>
public static class LayoutEvaluator
{
    /// <summary>
    /// Get a list of fields that are only referenced in hidden components in <see cref="LayoutEvaluatorState" />
    /// </summary>
    public static async Task<List<DataReference>> GetHiddenFieldsForRemoval(
        LayoutEvaluatorState state,
        bool includeHiddenRowChildren = false
    )
    {
        var hiddenModelBindings = new HashSet<DataReference>();
        var nonHiddenModelBindings = new HashSet<DataReference>();

        foreach (var context in await state.GetComponentContexts())
        {
            await HiddenFieldsForRemovalRecurs(
                state,
                includeHiddenRowChildren,
                hiddenModelBindings,
                nonHiddenModelBindings,
                context
            );
        }

        var forRemoval = hiddenModelBindings.Except(nonHiddenModelBindings);
        return forRemoval.ToList();
    }

    private static async Task HiddenFieldsForRemovalRecurs(
        LayoutEvaluatorState state,
        bool includeHiddenRowChildren,
        HashSet<DataReference> hiddenModelBindings,
        HashSet<DataReference> nonHiddenModelBindings,
        ComponentContext context
    )
    {
        // Recurse children
        foreach (var childContext in context.ChildContexts)
        {
            // Ignore children of hidden rows if includeHiddenRowChildren is false
            if (!includeHiddenRowChildren && childContext.Component is RepeatingGroupComponent)
            {
                var hiddenRows = await childContext.GetHiddenRows(state);
                var currentRow = childContext.RowIndices?[^1];
                var rowIsHidden = currentRow is not null && hiddenRows[currentRow.Value];
                if (rowIsHidden)
                {
                    continue;
                }
            }

            await HiddenFieldsForRemovalRecurs(
                state,
                includeHiddenRowChildren,
                hiddenModelBindings,
                nonHiddenModelBindings,
                childContext
            );
        }

        // Get dataReference for hidden rows
        if (context is { Component: RepeatingGroupComponent repGroup })
        {
            var hiddenRows = await context.GetHiddenRows(state);
            // Reverse order to get the last hidden row first so that the index is correct when removing from the data object
            foreach (var index in Enumerable.Range(0, hiddenRows.Length).Reverse())
            {
                var rowIndices = context.RowIndices?.Append(index).ToArray() ?? [index];
                var indexedBinding = await state.AddInidicies(
                    repGroup.DataModelBindings["group"],
                    context.DataElementIdentifier,
                    rowIndices
                );

                if (hiddenRows[index])
                {
                    hiddenModelBindings.Add(indexedBinding);
                }
                else
                {
                    nonHiddenModelBindings.Add(indexedBinding);
                }
            }
        }

        // Remove data if hidden
        if (context.Component is not null)
        {
            foreach (var (bindingName, binding) in context.Component.DataModelBindings)
            {
                if (bindingName == "group")
                {
                    continue;
                }

                var indexedBinding = await state.AddInidicies(binding, context);
                var isHidden = await context.IsHidden(state);

                if (isHidden)
                {
                    hiddenModelBindings.Add(indexedBinding);
                }
                else
                {
                    nonHiddenModelBindings.Add(indexedBinding);
                }
            }
        }
    }

    /// <summary>
    /// Remove fields that are only referenced from hidden fields from the data object in the state.
    /// </summary>
    [Obsolete("Use the async version of this method RemoveHiddenDataAsync")]
    public static void RemoveHiddenData(LayoutEvaluatorState state, RowRemovalOption rowRemovalOption)
    {
        RemoveHiddenDataAsync(state, rowRemovalOption).GetAwaiter().GetResult();
    }

    /// <summary>
    /// Remove fields that are only referenced from hidden fields from the data object in the state.
    /// </summary>
    public static async Task RemoveHiddenDataAsync(LayoutEvaluatorState state, RowRemovalOption rowRemovalOption)
    {
        var fields = await GetHiddenFieldsForRemoval(state);
        foreach (var dataReference in fields)
        {
            await state.RemoveDataField(dataReference, rowRemovalOption);
        }
    }

    /// <summary>
    /// Return a list of <see cref="ValidationIssue" /> for the given state and dataElementId
    /// </summary>
    public static async Task<List<ValidationIssue>> RunLayoutValidationsForRequired(LayoutEvaluatorState state)
    {
        var validationIssues = new List<ValidationIssue>();

        foreach (var context in await state.GetComponentContexts())
        {
            await RunLayoutValidationsForRequiredRecurs(validationIssues, state, context);
        }

        return validationIssues;
    }

    private static async Task RunLayoutValidationsForRequiredRecurs(
        List<ValidationIssue> validationIssues,
        LayoutEvaluatorState state,
        ComponentContext context
    )
    {
        ArgumentNullException.ThrowIfNull(context.Component);
        var hidden = await context.IsHidden(state);
        if (!hidden)
        {
            foreach (var childContext in context.ChildContexts)
            {
                await RunLayoutValidationsForRequiredRecurs(validationIssues, state, childContext);
            }

            var required = await ExpressionEvaluator.EvaluateBooleanExpression(state, context, "required", false);
            if (required)
            {
                foreach (var (bindingName, binding) in context.Component.DataModelBindings)
                {
                    var value = await state.GetModelData(binding, context.DataElementIdentifier, context.RowIndices);
                    if (value is null)
                    {
                        var field = await state.AddInidicies(binding, context);
                        validationIssues.Add(
                            new ValidationIssue()
                            {
                                Severity = ValidationIssueSeverity.Error,
                                DataElementId = field.DataElementIdentifier.ToString(),
                                Field = field.Field,
                                Description =
                                    $"{field.Field} is required in component with id {context.Component.LayoutId}.{context.Component.PageId}.{context.Component.Id} for binding {bindingName}",
                                Code = "required",
                            }
                        );
                    }
                }
            }
        }
    }
}
