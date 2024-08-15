using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Wrappers;

/// <summary>
/// Wrap the old <see cref="ITaskValidator"/> interface to the new <see cref="IValidator"/> interface.
/// </summary>
internal class TaskValidatorWrapper : IValidator
{
    private readonly ITaskValidator _taskValidator;

    /// <summary>
    /// Constructor that wraps an <see cref="ITaskValidator"/>
    /// </summary>
    public TaskValidatorWrapper(ITaskValidator taskValidator)
    {
        _taskValidator = taskValidator;
    }

    /// <inheritdoc />
    public string TaskId => _taskValidator.TaskId;

    /// <inheritdoc />
    public string ValidationSource => _taskValidator.ValidationSource;

    /// <inheritdoc />
    public Task<List<ValidationIssue>> Validate(
        Instance instance,
        string taskId,
        string? language,
        IInstanceDataAccessor instanceDataAccessor
    )
    {
        return _taskValidator.ValidateTask(instance, taskId, language);
    }

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(
        Instance instance,
        string taskId,
        List<DataElementChange> changes,
        IInstanceDataAccessor instanceDataAccessor
    )
    {
        // TaskValidator did not previously implement incremental validation, so we always return false
        return Task.FromResult(false);
    }
}
