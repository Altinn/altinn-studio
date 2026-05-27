using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Validator that runs the required rules in the layout
/// </summary>
public class RequiredLayoutValidator : IValidator
{
    private readonly IAppResources _appResources;

    /// <summary>
    /// Initializes a new instance of the <see cref="RequiredLayoutValidator"/> class.
    /// </summary>
    public RequiredLayoutValidator(IAppResources appResources)
    {
        _appResources = appResources;
    }

    /// <summary>
    /// We implement <see cref="ShouldRunForTask"/> instead
    /// </summary>
    public string TaskId => "*";

    /// <summary>
    /// Only run for tasks that specifies a layout set
    /// </summary>
    public bool ShouldRunForTask(string taskId) =>
        _appResources.GetLayoutSet()?.Sets.SelectMany(s => s.Tasks ?? []).Any(t => t == taskId) ?? false;

    /// <summary>
    /// This validator has the code "Required" and this is known by the frontend, who may request this validator to not run for incremental validation.
    /// </summary>
    public string ValidationSource => ValidationIssueSources.Required;

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        var evaluationState =
            dataAccessor.GetLayoutEvaluatorState()
            ?? throw new InvalidOperationException($"The evaluation state for task {taskId} could not be found.");
        return await LayoutEvaluator.RunLayoutValidationsForRequired(evaluationState);
    }

    /// <summary>
    /// We don't have an efficient way to figure out if changes to the model results in different validations, and frontend ignores this anyway
    /// </summary>
    public Task<bool> HasRelevantChanges(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes
    ) => Task.FromResult(true);
}
