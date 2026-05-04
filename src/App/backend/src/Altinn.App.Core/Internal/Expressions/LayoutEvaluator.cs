using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
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
    [Obsolete("Use the overload with evaluateRemoveWhenHidden parameter")]
    public static async Task<List<DataReference>> GetHiddenFieldsForRemoval(LayoutEvaluatorState state) =>
        await GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);

    /// <summary>
    /// Get a list of fields that are only referenced in hidden components in <see cref="LayoutEvaluatorState" />
    /// </summary>
    public static async Task<List<DataReference>> GetHiddenFieldsForRemoval(
        LayoutEvaluatorState state,
        bool evaluateRemoveWhenHidden
    )
    {
        var hiddenModelBindings = new HashSet<DataReference>();
        var nonHiddenModelBindings = new HashSet<DataReference>();

        var pageContexts = await state.GetComponentContexts();
        foreach (var pageContext in pageContexts)
        {
            await HiddenFieldsForRemovalRecurs(
                state,
                hiddenModelBindings,
                nonHiddenModelBindings,
                pageContext,
                evaluateRemoveWhenHidden
            );
        }

        var forRemoval = hiddenModelBindings.Except(nonHiddenModelBindings).ToList();

        return forRemoval;
    }

    private static async Task HiddenFieldsForRemovalRecurs(
        LayoutEvaluatorState state,
        HashSet<DataReference> hiddenModelBindings,
        HashSet<DataReference> nonHiddenModelBindings,
        ComponentContext context,
        bool evaluateRemoveWhenHidden
    )
    {
        if (context.Component is null)
        {
            throw new ArgumentNullException(
                nameof(context),
                "Context must have a component when removing hidden fields"
            );
        }

        var isHidden = await context.IsHidden(evaluateRemoveWhenHidden);

        // Schedule fields for removal
        foreach (var reference in await context.Component.GetDataReferencesToRemoveWhenHidden(context))
        {
            if (isHidden)
            {
                hiddenModelBindings.Add(reference);
            }
            else
            {
                nonHiddenModelBindings.Add(reference);
            }
        }

        // Recurse children
        foreach (var childContext in context.ChildContexts)
        {
            await HiddenFieldsForRemovalRecurs(
                state,
                hiddenModelBindings,
                nonHiddenModelBindings,
                childContext,
                evaluateRemoveWhenHidden
            );
        }
    }

    /// <summary>
    /// Remove fields that are only referenced from hidden fields from the data object in the state.
    /// </summary>
    [Obsolete("Use the async version of this method RemoveHiddenDataAsync")]
    public static void RemoveHiddenData(LayoutEvaluatorState state, RowRemovalOption rowRemovalOption)
    {
        RemoveHiddenDataAsync(state, rowRemovalOption, evaluateRemoveWhenHidden: false).GetAwaiter().GetResult();
    }

    /// <summary>
    /// Remove fields that are only referenced from hidden fields from the data object in the state.
    /// </summary>
    [Obsolete("Use the overload with evaluateRemoveWhenHidden parameter")]
    public static async Task RemoveHiddenDataAsync(LayoutEvaluatorState state, RowRemovalOption rowRemovalOption) =>
        await RemoveHiddenDataAsync(state, rowRemovalOption, evaluateRemoveWhenHidden: false);

    /// <summary>
    /// Remove fields that are only referenced from hidden fields from the data object in the state.
    /// </summary>
    public static async Task RemoveHiddenDataAsync(
        LayoutEvaluatorState state,
        RowRemovalOption rowRemovalOption,
        bool evaluateRemoveWhenHidden
    )
    {
        var fields = await GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden);

        // Ensure fields with higher row numbers are removed before fields with lower row numbers.
        foreach (var dataReference in OrderByListIndexReverse(fields))
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
        var hidden = await context.IsHidden(evaluateRemoveWhenHidden: false);
        if (!hidden)
        {
            foreach (var childContext in context.ChildContexts)
            {
                await RunLayoutValidationsForRequiredRecurs(validationIssues, state, childContext);
            }

            var required = await context.IsRequired();
            if (required)
            {
                foreach (var (bindingName, binding) in context.Component.DataModelBindings)
                {
                    var value = await state.GetModelData(binding, context.DataElementIdentifier, context.RowIndices);
                    if (
                        (value is null)
                        || (value is string s && string.IsNullOrWhiteSpace(s))
                        || value is System.Collections.ICollection { Count: 0 }
                    )
                    {
                        var field = await state.AddInidicies(binding, context);

                        var customTextParameters = new Dictionary<string, string>()
                        {
                            ["field"] = field.Field,
                            ["layoutId"] = context.Component.LayoutId,
                            ["pageId"] = context.Component.PageId,
                            ["componentId"] = context.Component.Id,
                            ["bindingName"] = bindingName,
                            ["pageName"] = await state.TranslateText(context.Component.PageId, context),
                        };
                        if (context.Component.TextResourceBindings.TryGetValue("title", out var titleBinding))
                        {
                            if (titleBinding.IsLiteralString)
                            {
                                customTextParameters["componentTitle"] = await state.TranslateText(
                                    titleBinding.ValueUnion.String,
                                    context
                                );
                            }
                            else
                            {
                                // TODO: consider evaluating the expression and translate the result
                            }
                        }

                        validationIssues.Add(
                            new ValidationIssue()
                            {
                                Severity = ValidationIssueSeverity.Error,
                                DataElementId = field.DataElementIdentifier.ToString(),
                                Field = field.Field,
                                Code = "required",
                                CustomTextKey = "backend.validation_errors.required",
                                CustomTextParameters = customTextParameters,
                            }
                        );
                    }
                }
            }
        }
    }

#if NET10_0_OR_GREATER
    private static readonly IComparer<string> _naturalStringComparer = StringComparer.Create(
        CultureInfo.InvariantCulture,
        CompareOptions.NumericOrdering
    );
#else
    private static readonly IComparer<string> _naturalStringComparer = NaturalStringComparerPolyfill.Instance;
#endif

    internal static IEnumerable<DataReference> OrderByListIndexReverse(List<DataReference> fields)
    {
        return fields
            .OrderByDescending(f => f.DataElementIdentifier.Guid)
            .ThenByDescending(f => f.Field, _naturalStringComparer);
    }
}
