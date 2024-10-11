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
    private readonly List<DataType> _dataTypes;

    public DataElementValidatorWrapper(
        IDataElementValidator dataElementValidator,
        string taskId,
        List<DataType> dataTypes
    )
    {
        _dataElementValidator = dataElementValidator;
        _taskId = taskId;
        _dataTypes = dataTypes;
    }

    /// <inheritdoc />
    public string TaskId => _taskId;

    /// <inheritdoc />
    public string ValidationSource => _dataElementValidator.ValidationSource;

    /// <summary>
    /// The old <see cref="IDataElementValidator"/> interface does not support incremental validation.
    /// so the issues will only show up when process/next fails
    /// </summary>
    public bool NoIncrementalValidation => true;

    /// <summary>
    /// Run all legacy <see cref="IDataElementValidator"/> instances for the given <see cref="DataType"/>.
    /// </summary>
    public async Task<List<ValidationIssue>> Validate(
        Instance instance,
        IInstanceDataAccessor instanceDataAccessor,
        string taskId,
        string? language
    )
    {
        var issues = new List<ValidationIssue>();
        var validateAllElements = _dataElementValidator.DataType == "*";
        foreach (var dataElement in instance.Data)
        {
            if (validateAllElements || _dataElementValidator.DataType == dataElement.DataType)
            {
                var dataType = _dataTypes.Find(d => d.Id == dataElement.DataType);
                if (dataType is null)
                {
                    throw new InvalidOperationException(
                        $"DataType {dataElement.DataType} not found in dataTypes from applicationmetadata"
                    );
                }
                var dataElementValidationResult = await _dataElementValidator.ValidateDataElement(
                    instance,
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
    public Task<bool> HasRelevantChanges(
        Instance instance,
        IInstanceDataAccessor instanceDataAccessor,
        string taskId,
        List<DataElementChange> changes
    )
    {
        // DataElementValidator did not previously implement incremental validation, so we always return false
        throw new NotImplementedException(
            "DataElementValidatorWrapper should not be used for incremental validation, because it sets NoIncrementalValidation to true"
        );
    }
}
