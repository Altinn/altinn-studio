using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Features.Validation.Wrappers;
using Altinn.App.Core.Internal.App;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Interface for a factory that can provide validators for a given task or data element.
/// </summary>
public interface IValidatorFactory
{
    /// <summary>
    /// Gets all task validators for a given task.
    /// </summary>
    public IEnumerable<IValidator> GetValidators(string taskId);
}

/// <summary>
/// Implementation of <see cref="IValidatorFactory"/> that takes IEnumerable of validators in constructor from the service provider.
/// </summary>
public class ValidatorFactory : IValidatorFactory
{
    private readonly IEnumerable<ITaskValidator> _taskValidators;
    private readonly IOptions<GeneralSettings> _generalSettings;
    private readonly IEnumerable<IDataElementValidator> _dataElementValidators;
    private readonly IEnumerable<IFormDataValidator> _formDataValidators;
    private readonly IEnumerable<IValidator> _validators;
#pragma warning disable CS0618 // Type or member is obsolete
    private readonly IEnumerable<IInstanceValidator> _instanceValidators;
#pragma warning restore CS0618 // Type or member is obsolete
    private readonly IAppMetadata _appMetadata;

    /// <summary>
    /// Initializes a new instance of the <see cref="ValidatorFactory"/> class.
    /// </summary>
    public ValidatorFactory(
        IEnumerable<ITaskValidator> taskValidators,
        IOptions<GeneralSettings> generalSettings,
        IEnumerable<IDataElementValidator> dataElementValidators,
        IEnumerable<IFormDataValidator> formDataValidators,
        IEnumerable<IValidator> validators,
#pragma warning disable CS0618 // Type or member is obsolete
        IEnumerable<IInstanceValidator> instanceValidators,
#pragma warning restore CS0618 // Type or member is obsolete
        IAppMetadata appMetadata
    )
    {
        _taskValidators = taskValidators;
        _generalSettings = generalSettings;
        _dataElementValidators = dataElementValidators;
        _formDataValidators = formDataValidators;
        _validators = validators;
        _instanceValidators = instanceValidators;
        _appMetadata = appMetadata;
    }

    private IEnumerable<IValidator> GetIValidators(string taskId)
    {
        return _validators.Where(v => v.ShouldRunForTask(taskId));
    }

    private IEnumerable<ITaskValidator> GetTaskValidators(string taskId)
    {
        return _taskValidators.Where(tv => tv.TaskId == "*" || tv.TaskId == taskId);
    }

    private IEnumerable<IDataElementValidator> GetDataElementValidators(string taskId, List<DataType> dataTypes)
    {
        foreach (var dataElementValidator in _dataElementValidators)
        {
            if (dataElementValidator.DataType == "*")
            {
                yield return dataElementValidator;
            }
            else
            {
                var dataType = dataTypes.Find(d => d.Id == dataElementValidator.DataType);
                if (dataType is null)
                {
                    throw new InvalidOperationException(
                        $"DataType {dataElementValidator.DataType} from {dataElementValidator.ValidationSource} not found in dataTypes from applicationmetadata"
                    );
                }
                if (dataType.TaskId == taskId)
                {
                    yield return dataElementValidator;
                }
            }
        }
    }

    private IEnumerable<IFormDataValidator> GetFormDataValidators(string taskId, List<DataType> dataTypes)
    {
        foreach (var formDataValidator in _formDataValidators)
        {
            if (formDataValidator.DataType == "*")
            {
                yield return formDataValidator;
            }
            else
            {
                var dataType = dataTypes.Find(d => d.Id == formDataValidator.DataType);
                if (dataType is null)
                {
                    throw new InvalidOperationException(
                        $"DataType {formDataValidator.DataType} from {formDataValidator.ValidationSource} not found in dataTypes from applicationmetadata"
                    );
                }
                if (dataType.TaskId == taskId)
                {
                    yield return formDataValidator;
                }
            }
        }
    }

    /// <summary>
    /// Get all validators for a given task. Wrap <see cref="ITaskValidator"/>, <see cref="IDataElementValidator"/> and <see cref="IFormDataValidator"/>
    /// so that they behave as <see cref="IValidator"/>.
    /// </summary>
    public IEnumerable<IValidator> GetValidators(string taskId)
    {
        var validators = new List<IValidator>();
        // add new style validators
        validators.AddRange(GetIValidators(taskId));
        // add legacy task validators, data element validators and form data validators
        validators.AddRange(GetTaskValidators(taskId).Select(tv => new TaskValidatorWrapper(tv)));
        var dataTypes = _appMetadata.GetApplicationMetadata().Result.DataTypes;

        validators.AddRange(
            GetDataElementValidators(taskId, dataTypes).Select(dev => new DataElementValidatorWrapper(dev, taskId))
        );
        validators.AddRange(
            GetFormDataValidators(taskId, dataTypes).Select(fdv => new FormDataValidatorWrapper(fdv, taskId))
        );

        // add legacy instance validators wrapped in IValidator wrappers
        foreach (var instanceValidator in _instanceValidators)
        {
            validators.Add(new LegacyIInstanceValidatorTaskValidator(_generalSettings, instanceValidator));
            validators.Add(new LegacyIInstanceValidatorFormDataValidator(_generalSettings, instanceValidator));
        }

        return validators;
    }
}
