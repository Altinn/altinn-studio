using System.Globalization;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Utilities for using the expression results to do tasks in backend
/// </summary>
public static class LayoutEvaluator
{
    // The component types that hold attachments in app-frontend, and the bindings that point at them
    private const string FileUploadType = "FileUpload";
    private const string ImageUploadType = "ImageUpload";
    private const string SimpleBindingName = "simpleBinding";
    private const string ListBindingName = "list";

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
        // Without layouts for the task there are no components, so nothing can be hidden
        if (!state.HasComponentModel)
        {
            return [];
        }

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
    public static async Task RemoveHiddenData(
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
    /// Get the attachments that only belong to hidden FileUpload and ImageUpload components.
    /// </summary>
    /// <remarks>
    /// An attachment belongs to a component the same way as in app-frontend: the data type id is the component id,
    /// and the data type is not a form data type and belongs to the task or to no task. The attachments whose ids
    /// are in the component's <c>simpleBinding</c> or <c>list</c> binding belong to it. A component without
    /// either binding, outside a repeating group, has all attachments of its data type. Attachments that belong to
    /// no component are kept. Call this before <see cref="RemoveHiddenData"/> with the same state, so the bindings
    /// in hidden rows are still there and each component's hidden expression is evaluated once.
    /// </remarks>
    internal static async Task<List<DataElementIdentifier>> GetHiddenAttachmentsForRemoval(
        LayoutEvaluatorState state,
        string taskId
    )
    {
        // Without layouts for the task there are no components, so nothing can be hidden
        if (!state.HasComponentModel)
        {
            return [];
        }

        var hiddenAttachments = new HashSet<DataElementIdentifier>();
        var nonHiddenAttachments = new HashSet<DataElementIdentifier>();

        foreach (var pageContext in await state.GetComponentContexts())
        {
            foreach (var context in pageContext.Descendants)
            {
                var attachments = await GetAttachmentsToRemoveWhenHidden(state, context, taskId);
                if (attachments.Count == 0)
                {
                    continue;
                }

                if (await context.IsHidden(evaluateRemoveWhenHidden: true))
                {
                    hiddenAttachments.UnionWith(attachments);
                }
                else
                {
                    nonHiddenAttachments.UnionWith(attachments);
                }
            }
        }

        hiddenAttachments.ExceptWith(nonHiddenAttachments);
        return hiddenAttachments.ToList();
    }

    /// <summary>
    /// Get the attachments that belong to the FileUpload or ImageUpload component in this context (one row of a
    /// repeating group), or none for other component types. Like
    /// <see cref="Models.Layout.Components.Base.BaseComponent.GetDataReferencesToRemoveWhenHidden"/>, it returns
    /// the same attachments whether or not the context is hidden.
    /// </summary>
    private static async Task<List<DataElementIdentifier>> GetAttachmentsToRemoveWhenHidden(
        LayoutEvaluatorState state,
        ComponentContext context,
        string taskId
    )
    {
        var component = context.Component;
        ArgumentNullException.ThrowIfNull(component);
        if (
            !component.Type.Equals(FileUploadType, StringComparison.OrdinalIgnoreCase)
            && !component.Type.Equals(ImageUploadType, StringComparison.OrdinalIgnoreCase)
        )
        {
            return [];
        }

        var dataType = state.DataAccessor.DataTypes.FirstOrDefault(dt =>
            dt.Id.Equals(component.Id, StringComparison.Ordinal)
        );
        if (
            dataType is null
            || dataType.AppLogic?.ClassRef is not null
            || dataType.Id == PdfService.PdfElementType
            || (dataType.TaskId is not null && dataType.TaskId != taskId)
        )
        {
            return [];
        }

        // Binding values are compared to the data element ids as strings, like app-frontend does
        bool hasSimpleBinding = component.DataModelBindings.TryGetValue(SimpleBindingName, out var simpleBinding);
        bool hasListBinding = component.DataModelBindings.TryGetValue(ListBindingName, out var listBinding);
        string? simpleValue = hasSimpleBinding
            ? (await state.GetModelData(simpleBinding, context.DataElementIdentifier, context.RowIndices)) as string
            : null;
        object? listValue = hasListBinding
            ? await state.GetModelData(listBinding, context.DataElementIdentifier, context.RowIndices)
            : null;
        var listIds = listValue is System.Collections.IEnumerable list
            ? list.OfType<string>().ToHashSet(StringComparer.Ordinal)
            : [];

        // Same rule as app-frontend: only a component without bindings, outside a repeating group (without row
        // indices), has all attachments of its data type. An empty binding value gives it none.
        bool includeAllOfDataType = !hasSimpleBinding && !hasListBinding && context.RowIndices is null;

        var attachments = new List<DataElementIdentifier>();
        foreach (var dataElement in state.Instance.Data.Where(d => d.DataType == dataType.Id))
        {
            if (includeAllOfDataType || dataElement.Id == simpleValue || listIds.Contains(dataElement.Id))
            {
                attachments.Add(dataElement);
            }
        }

        return attachments;
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

                        var pageName = await state.TranslateText(context.Component.PageId, context);
                        string? componentTitle = null;
                        if (context.Component.TextResourceBindings.TryGetValue("title", out var titleBinding))
                        {
                            if (titleBinding.IsLiteralString)
                            {
                                componentTitle = await state.TranslateText(titleBinding.ValueUnion.String, context);
                            }
                            else
                            {
                                // TODO: consider evaluating the expression and translate the result
                            }
                        }

                        var issue = BuiltInValidationIssues.Required(
                            dataElementId: field.DataElementIdentifier.ToString(),
                            field: field.Field,
                            layoutId: context.Component.LayoutId,
                            pageId: context.Component.PageId,
                            componentId: context.Component.Id,
                            bindingName: bindingName,
                            pageName: pageName,
                            componentTitle: componentTitle
                        );
                        issue.ComponentId = context.Component.Id;
                        issue.RowIndexes = context.RowIndices;
                        validationIssues.Add(issue);
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
