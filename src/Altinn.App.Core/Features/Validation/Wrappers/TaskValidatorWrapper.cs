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

    /// <summary>
    /// The old <see cref="ITaskValidator"/> interface does not support incremental validation.
    /// so the issues will only show up when process/next fails
    /// </summary>
    public bool NoIncrementalValidation => true;

    /// <inheritdoc />
    public Task<List<ValidationIssue>> Validate(
        Instance instance,
        IInstanceDataAccessor instanceDataAccessor,
        string taskId,
        string? language
    )
    {
        return _taskValidator.ValidateTask(instance, taskId, language);
    }

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(
        Instance instance,
        IInstanceDataAccessor instanceDataAccessor,
        string taskId,
        List<DataElementChange> changes
    )
    {
        throw new NotImplementedException(
            "TaskValidatorWrapper should not be used for incremental validation, because it sets NoIncrementalValidation to true"
        );
    }
}
