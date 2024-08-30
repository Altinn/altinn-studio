using System.Diagnostics;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Models;
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
        var existsForRemoval = new List<DataReference>();
        foreach (var keyToRemove in forRemoval)
        {
            if (await state.GetModelData(keyToRemove.Field, keyToRemove.DataElementId, default) is not null)
            {
                existsForRemoval.Add(keyToRemove);
            }
        }
        return existsForRemoval;
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
            if (!includeHiddenRowChildren && context.HiddenRows is not null)
            {
                var currentRow = childContext.RowIndices?.Last();
                var rowIsHidden = currentRow is not null && context.HiddenRows.Contains(currentRow.Value);
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

        // Remove data for hidden rows
        if (
            context.Component is RepeatingGroupComponent repGroup
            && context.RowLength is not null
            && context.HiddenRows is not null
        )
        {
            foreach (var index in Enumerable.Range(0, context.RowLength.Value).Reverse())
            {
                var rowIndices = context.RowIndices?.Append(index).ToArray() ?? [index];
                var newContext = new ComponentContext(
                    context.Component,
                    rowIndices,
                    rowLength: null,
                    dataElementId: context.DataElementId,
                    childContexts: context.ChildContexts
                );
                var indexedBinding = await state.AddInidicies(repGroup.DataModelBindings["group"], newContext);
                var fieldReference = new DataReference()
                {
                    Field = indexedBinding.Field,
                    DataElementId = newContext.DataElementId
                };
                if (context.HiddenRows.Contains(index))
                {
                    hiddenModelBindings.Add(fieldReference);
                }
                else
                {
                    nonHiddenModelBindings.Add(fieldReference);
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
                var fieldReference = new DataReference()
                {
                    Field = indexedBinding.Field,
                    DataElementId = context.DataElementId
                };

                if (context.IsHidden == true)
                {
                    hiddenModelBindings.Add(fieldReference);
                }
                else
                {
                    nonHiddenModelBindings.Add(fieldReference);
                }
            }
        }
    }

    /// <summary>
    /// Remove fields that are only referenced from hidden fields from the data object in the state.
    /// </summary>
    public static async Task RemoveHiddenData(LayoutEvaluatorState state, RowRemovalOption rowRemovalOption)
    {
        var fields = await GetHiddenFieldsForRemoval(state);
        foreach (var dataReference in fields)
        {
            state.RemoveDataField(dataReference.Field, dataReference.DataElementId, rowRemovalOption);
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
        if (context.IsHidden == false)
        {
            foreach (var childContext in context.ChildContexts)
            {
                await RunLayoutValidationsForRequiredRecurs(validationIssues, state, childContext);
            }

            var required = await ExpressionEvaluator.EvaluateBooleanExpression(state, context, "required", false);
            if (required && context.Component is not null)
            {
                foreach (var (bindingName, binding) in context.Component.DataModelBindings)
                {
                    if (await state.GetModelData(binding, context.DataElementId, context.RowIndices) is null)
                    {
                        var field = await state.AddInidicies(binding, context);
                        DataElementId dataElementId = context.DataElementId;
                        if (field.DataType is not null) { }
                        validationIssues.Add(
                            new ValidationIssue()
                            {
                                Severity = ValidationIssueSeverity.Error,
                                DataElementId = dataElementId.ToString(),
                                Field = field.Field,
                                Description = $"{field.Field} is required in component with id {context.Component.Id}",
                                Code = "required",
                            }
                        );
                    }
                }
            }
        }
    }
}
