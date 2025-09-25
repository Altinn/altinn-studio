using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Wrappers;

/// <summary>
/// Wrap the old <see cref="IDataElementValidator"/> interface to the new <see cref="IValidator"/> interface.
/// </summary>
internal class DataElementValidatorWrapper : IValidator
{
    private readonly IDataElementValidator _dataElementValidator;
    private readonly string _taskId;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;

    public DataElementValidatorWrapper(
        /* altinn:injection:ignore */
        IDataElementValidator dataElementValidator,
        string taskId,
        IDataElementAccessChecker dataElementAccessChecker
    )
    {
        _dataElementValidator = dataElementValidator;
        _taskId = taskId;
        _dataElementAccessChecker = dataElementAccessChecker;
    }

    /// <inheritdoc />
    public string TaskId => _taskId;

    /// <inheritdoc />
    public string ValidationSource => _dataElementValidator.ValidationSource;

    /// <summary>
    /// The old <see cref="IDataElementValidator"/> interface does not support incremental validation.
    /// so the issues will only show up when process/next fails
    /// </summary>
    public bool NoIncrementalValidation => _dataElementValidator.NoIncrementalValidation;

    /// <summary>
    /// Run all legacy <see cref="IDataElementValidator"/> instances for the given <see cref="DataType"/>.
    /// </summary>
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        var issues = new List<ValidationIssue>();
        var validateAllElements = _dataElementValidator.DataType == "*";
        foreach (var (dataType, dataElement) in dataAccessor.GetDataElementsForTask(taskId))
        {
            if (await _dataElementAccessChecker.CanRead(dataAccessor.Instance, dataType) is false)
            {
                continue;
            }

            if (validateAllElements || _dataElementValidator.DataType == dataElement.DataType)
            {
                var dataElementValidationResult = await _dataElementValidator.ValidateDataElement(
                    dataAccessor.Instance,
                    dataElement,
                    dataType,
                    language
                );

                // Assume that issues from a IDataElementValidator is for the data element it was run for
                dataElementValidationResult.ForEach(i => i.DataElementId ??= dataElement.Id);
                issues.AddRange(dataElementValidationResult);
            }
        }

        return issues;
    }

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        // IDataElementValidator does not have a HasRelevantChanges method, so we need to return something sensible.
        // By default it sets NoIncrementalValidation to true, so this method will never get called,
        // but if someone overrides it to false, we must just assume there might be relevant changes on every PATCH
        return Task.FromResult(true);
    }
}
