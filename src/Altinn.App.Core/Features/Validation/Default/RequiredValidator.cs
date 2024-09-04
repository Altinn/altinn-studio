using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Validator that runs the required rules in the layout
/// </summary>
public class RequiredLayoutValidator : IValidator
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
    /// Run for all tasks
    /// </summary>
    public string TaskId => "*";

    /// <summary>
    /// This validator has the code "Required" and this is known by the frontend, who may request this validator to not run for incremental validation.
    /// </summary>
    public string ValidationSource => ValidationIssueSources.Required;

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> Validate(
        Instance instance,
        IInstanceDataAccessor instanceDataAccessor,
        string taskId,
        string? language
    )
    {
        var evaluationState = await _layoutEvaluatorStateInitializer.Init(
            instanceDataAccessor,
            taskId,
            gatewayAction: null,
            language
        );

        return await LayoutEvaluator.RunLayoutValidationsForRequired(evaluationState);
    }

    /// <summary>
    /// We don't have an efficient way to figure out if changes to the model results in different validations, and frontend ignores this anyway
    /// </summary>
    public Task<bool> HasRelevantChanges(
        Instance instance,
        string taskId,
        List<DataElementChange> changes,
        IInstanceDataAccessor instanceDataAccessor
    ) => Task.FromResult(true);
}
