using Altinn.App.Core.Helpers.DataModel;
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
    public static List<ModelBinding> GetHiddenFieldsForRemoval(
        LayoutEvaluatorState state,
        bool includeHiddenRowChildren = false
    )
    {
        var hiddenModelBindings = new HashSet<ModelBinding>();
        var nonHiddenModelBindings = new HashSet<ModelBinding>();

        foreach (var context in state.GetComponentContexts())
        {
            HiddenFieldsForRemovalRecurs(
                state,
                includeHiddenRowChildren,
                hiddenModelBindings,
                nonHiddenModelBindings,
                context
            );
        }

        var forRemoval = hiddenModelBindings.Except(nonHiddenModelBindings);
        var existsForRemoval = forRemoval.Where(key => state.GetModelData(key) is not null);
        return existsForRemoval.ToList();
    }

    private static void HiddenFieldsForRemovalRecurs(
        LayoutEvaluatorState state,
        bool includeHiddenRowChildren,
        HashSet<ModelBinding> hiddenModelBindings,
        HashSet<ModelBinding> nonHiddenModelBindings,
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

            HiddenFieldsForRemovalRecurs(
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
                var indexedBinding = state.AddInidicies(repGroup.DataModelBindings["group"], rowIndices);
                if (context.HiddenRows.Contains(index))
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

                var indexed_binding = state.AddInidicies(binding, context);

                if (context.IsHidden == true)
                {
                    hiddenModelBindings.Add(indexed_binding);
                }
                else
                {
                    nonHiddenModelBindings.Add(indexed_binding);
                }
            }
        }
    }

    /// <summary>
    /// Remove fields that are only refrenced from hidden fields from the data object in the state.
    /// </summary>
    public static void RemoveHiddenData(LayoutEvaluatorState state, RowRemovalOption rowRemovalOption)
    {
        var fields = GetHiddenFieldsForRemoval(state);
        foreach (var field in fields)
        {
            state.RemoveDataField(field, rowRemovalOption);
        }
    }

    /// <summary>
    /// Return a list of <see cref="ValidationIssue" /> for the given state and dataElementId
    /// </summary>
    public static List<ValidationIssue> RunLayoutValidationsForRequired(LayoutEvaluatorState state)
    {
        var validationIssues = new List<ValidationIssue>();

        foreach (var context in state.GetComponentContexts())
        {
            RunLayoutValidationsForRequiredRecurs(validationIssues, state, context);
        }

        return validationIssues;
    }

    private static void RunLayoutValidationsForRequiredRecurs(
        List<ValidationIssue> validationIssues,
        LayoutEvaluatorState state,
        ComponentContext context
    )
    {
        if (context.IsHidden == false)
        {
            foreach (var childContext in context.ChildContexts)
            {
                RunLayoutValidationsForRequiredRecurs(validationIssues, state, childContext);
            }

            var required = ExpressionEvaluator.EvaluateBooleanExpression(state, context, "required", false);
            if (required && context.Component is not null)
            {
                foreach (var (bindingName, binding) in context.Component.DataModelBindings)
                {
                    if (state.GetModelData(binding, context) is null)
                    {
                        var field = state.AddInidicies(binding, context);
                        validationIssues.Add(
                            new ValidationIssue()
                            {
                                Severity = ValidationIssueSeverity.Error,
                                DataElementId = state.GetDataElement(field)?.Id,
                                Field = field.Field,
                                Description = $"{field.Field} is required in component with id {context.Component.Id}",
                                Code = "required",
                                Source = ValidationIssueSources.Required
                            }
                        );
                    }
                }
            }
        }
    }
}
