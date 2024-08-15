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
    /// Run all legacy <see cref="IDataElementValidator"/> instances for the given <see cref="DataType"/>.
    /// </summary>
    public async Task<List<ValidationIssue>> Validate(
        Instance instance,
        string taskId,
        string? language,
        IInstanceDataAccessor instanceDataAccessor
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
                issues.AddRange(dataElementValidationResult);
            }
        }

        return issues;
    }

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(
        Instance instance,
        string taskId,
        List<DataElementChange> changes,
        IInstanceDataAccessor instanceDataAccessor
    )
    {
        // DataElementValidator did not previously implement incremental validation, so we always return false
        return Task.FromResult(false);
    }
}
