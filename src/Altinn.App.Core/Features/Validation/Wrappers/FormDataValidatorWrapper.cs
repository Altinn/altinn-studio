namespace Altinn.App.Core.Features.Validation.Wrappers;

using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Wrap the old <see cref="IFormDataValidator"/> interface to the new <see cref="IValidator"/> interface.
/// </summary>
internal class FormDataValidatorWrapper : IValidator
{
    private readonly IFormDataValidator _formDataValidator;
    private readonly string _taskId;
    private readonly List<DataType> _dataTypes;

    public FormDataValidatorWrapper(IFormDataValidator formDataValidator, string taskId, List<DataType> dataTypes)
    {
        _formDataValidator = formDataValidator;
        _taskId = taskId;
        _dataTypes = dataTypes;
    }

    /// <inheritdoc />
    public string TaskId => _taskId;

    /// <inheritdoc />
    public string ValidationSource => _formDataValidator.ValidationSource;

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
        var validateAllElements = _formDataValidator.DataType == "*";
        foreach (var dataElement in instance.Data)
        {
            if (!validateAllElements && _formDataValidator.DataType != dataElement.DataType)
            {
                continue;
            }

            var data = await instanceDataAccessor.Get(dataElement);
            var dataElementValidationResult = await _formDataValidator.ValidateFormData(
                instance,
                dataElement,
                data,
                language
            );
            issues.AddRange(dataElementValidationResult);
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
        try
        {
            foreach (var change in changes)
            {
                if (
                    (_formDataValidator.DataType == "*" || _formDataValidator.DataType == change.DataElement.DataType)
                    && _formDataValidator.HasRelevantChanges(change.CurrentValue, change.PreviousValue)
                )
                {
                    return Task.FromResult(true);
                }
            }

            return Task.FromResult(false);
        }
        catch (Exception e)
        {
            return Task.FromException<bool>(e);
        }
    }
}
