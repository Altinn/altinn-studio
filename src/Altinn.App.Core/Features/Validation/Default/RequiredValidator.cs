using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Validator that runs the required rules in the layout
/// </summary>
public class RequiredLayoutValidator : IFormDataValidator
{
    private readonly ILayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;

    /// <summary>
    /// Initializes a new instance of the <see cref="RequiredLayoutValidator"/> class.
    /// </summary>
    public RequiredLayoutValidator(ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer)
    {
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
    }

    /// <summary>
    /// Run for all data types
    /// </summary>
    public string DataType => "*";

    /// <summary>
    /// This validator has the code "Required" and this is known by the frontend, who may request this validator to not run for incremental validation.
    /// </summary>
    public string ValidationSource => "Required";

    /// <summary>
    /// We don't have an efficient way to figure out if changes to the model results in different validations, and frontend ignores this anyway
    /// </summary>
    public bool HasRelevantChanges(object current, object previous) => true;

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    )
    {
        var taskId = instance.Process.CurrentTask.ElementId;

        var evaluationState = await _layoutEvaluatorStateInitializer.Init(
            instance,
            taskId,
            gatewayAction: null,
            language
        );

        return LayoutEvaluator.RunLayoutValidationsForRequired(evaluationState);
    }
}
