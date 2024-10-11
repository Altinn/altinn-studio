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

    public FormDataValidatorWrapper(IFormDataValidator formDataValidator, string taskId)
    {
        _formDataValidator = formDataValidator;
        _taskId = taskId;
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
        IInstanceDataAccessor instanceDataAccessor,
        string taskId,
        string? language
    )
    {
        var issues = new List<ValidationIssue>();
        var validateAllElements = _formDataValidator.DataType == "*";
        foreach (var dataElement in instance.Data)
        {
            var dataType = instanceDataAccessor.GetDataType(dataElement);
            if (dataType.AppLogic?.ClassRef == null)
            {
                continue;
            }
            if (!validateAllElements && _formDataValidator.DataType != dataElement.DataType)
            {
                continue;
            }

            var data = await instanceDataAccessor.GetFormData(dataElement);
            var dataElementValidationResult = await _formDataValidator.ValidateFormData(
                instance,
                dataElement,
                data,
                language
            );
            // Assume issues from a IFormDataValidator are related to the data element
            dataElementValidationResult.ForEach(i => i.DataElementId ??= dataElement.Id);
            issues.AddRange(dataElementValidationResult);
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
        try
        {
            foreach (var change in changes)
            {
                if (
                    (_formDataValidator.DataType == "*" || _formDataValidator.DataType == change.DataElement.DataType)
                    && _formDataValidator.HasRelevantChanges(change.CurrentFormData, change.PreviousFormData)
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
