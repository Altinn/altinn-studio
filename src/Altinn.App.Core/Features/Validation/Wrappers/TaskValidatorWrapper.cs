using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;

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
    public TaskValidatorWrapper(
        /* altinn:injection:ignore */
        ITaskValidator taskValidator
    )
    {
        _taskValidator = taskValidator;
    }

    /// <inheritdoc />
    public string TaskId => _taskValidator.TaskId;

    /// <inheritdoc />
    public string ValidationSource => _taskValidator.ValidationSource;

    /// <inheritdoc />
    public bool NoIncrementalValidation => _taskValidator.NoIncrementalValidation;

    /// <inheritdoc />
    public Task<List<ValidationIssue>> Validate(IInstanceDataAccessor dataAccessor, string taskId, string? language)
    {
        return _taskValidator.ValidateTask(dataAccessor.Instance, taskId, language);
    }

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        // ITaskValidator does not have a HasRelevantChanges method, so we need to return something sensible.
        // By default it sets NoIncrementalValidation to true, so this method will never get called,
        // but if someone overrides it to false, we must just assume there might be relevant changes on every PATCH
        return Task.FromResult(true);
    }
}
