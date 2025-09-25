using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Validation.Wrappers;

/// <summary>
/// Wrap the old <see cref="IFormDataValidator"/> interface to the new <see cref="IValidator"/> interface.
/// </summary>
internal class FormDataValidatorWrapper : IValidator
{
    private readonly IFormDataValidator _formDataValidator;
    private readonly string _taskId;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;

    public FormDataValidatorWrapper(
        /* altinn:injection:ignore */
        IFormDataValidator formDataValidator,
        string taskId,
        IDataElementAccessChecker dataElementAccessChecker
    )
    {
        _formDataValidator = formDataValidator;
        _taskId = taskId;
        _dataElementAccessChecker = dataElementAccessChecker;
    }

    /// <inheritdoc />
    public string TaskId => _taskId;

    /// <inheritdoc />
    public string ValidationSource => _formDataValidator.ValidationSource;

    /// <inheritdoc />
    public bool NoIncrementalValidation => _formDataValidator.NoIncrementalValidation;

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
        var validateAllElements = _formDataValidator.DataType == "*";
        foreach (var (dataType, dataElement) in dataAccessor.GetDataElementsWithFormData())
        {
            if (await _dataElementAccessChecker.CanRead(dataAccessor.Instance, dataType) is false)
            {
                continue;
            }

            if (!validateAllElements && _formDataValidator.DataType != dataType.Id)
            {
                continue;
            }

            var data = await dataAccessor.GetFormData(dataElement);
            var dataElementValidationResult = await _formDataValidator.ValidateFormData(
                dataAccessor.Instance,
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
    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        try
        {
            foreach (var change in changes.FormDataChanges)
            {
                // Check if the DataType is a wildcard or matches the change's DataType, and if the change is not an update or has relevant changes
                if (_formDataValidator.DataType == "*" || _formDataValidator.DataType == change.DataType.Id)
                {
                    if (change.Type != ChangeType.Updated)
                    {
                        return Task.FromResult(true);
                    }

                    if (_formDataValidator.HasRelevantChanges(change.CurrentFormData, change.PreviousFormData))
                    {
                        return Task.FromResult(true);
                    }
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
