using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Interface for a factory that can provide validators for a given task or data element.
/// </summary>
public interface IValidatorFactory
{
    /// <summary>
    /// Gets all task validators for a given task.
    /// </summary>
    public IEnumerable<ITaskValidator> GetTaskValidators(string taskId);
    /// <summary>
    /// Gets all data element validators for a given data element.
    /// </summary>
    public IEnumerable<IDataElementValidator> GetDataElementValidators(string dataTypeId);
    /// <summary>
    /// Gets all form data validators for a given data element.
    /// </summary>
    public IEnumerable<IFormDataValidator> GetFormDataValidators(string dataTypeId);
}

/// <summary>
/// Implementation of <see cref="IValidatorFactory"/> that takes IEnumerable of validators in constructor from the service provider.
/// </summary>
public class ValidatorFactory : IValidatorFactory
{
    private readonly IEnumerable<ITaskValidator> _taskValidators;
    private readonly IEnumerable<IDataElementValidator> _dataElementValidators;
    private readonly IEnumerable<IFormDataValidator> _formDataValidators;

    /// <summary>
    /// Initializes a new instance of the <see cref="ValidatorFactory"/> class.
    /// </summary>
    public ValidatorFactory(IEnumerable<ITaskValidator> taskValidators, IEnumerable<IDataElementValidator> dataElementValidators, IEnumerable<IFormDataValidator> formDataValidators)
    {
        _taskValidators = taskValidators;
        _dataElementValidators = dataElementValidators;
        _formDataValidators = formDataValidators;
    }
    /// <inheritdoc />
    public IEnumerable<ITaskValidator> GetTaskValidators(string taskId)
    {
        return _taskValidators.Where(tv => tv.TaskId == "*" || tv.TaskId == taskId);
    }
    /// <inheritdoc />
    public IEnumerable<IDataElementValidator> GetDataElementValidators(string dataTypeId)
    {
        return _dataElementValidators.Where(dev => dev.DataType == "*" || dev.DataType == dataTypeId);
    }
    /// <inheritdoc />
    public IEnumerable<IFormDataValidator> GetFormDataValidators(string dataTypeId)
    {
        return _formDataValidators.Where(fdv => fdv.DataType == "*" || fdv.DataType == dataTypeId);
    }
}