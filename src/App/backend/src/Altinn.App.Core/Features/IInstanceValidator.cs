using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.App.Core.Features;

/// <summary>
/// IInstanceValidator defines the methods that are used to validate data and tasks
/// </summary>
[Obsolete($"Use {nameof(ITaskValidator)}, {nameof(IDataElementValidator)} or {nameof(IFormDataValidator)} instead")]
[ImplementableByApps]
public interface IInstanceValidator
{
    /// <summary>
    /// Is called to run custom data validation events.
    /// </summary>
    /// <param name="data">The data to validate</param>
    /// <param name="validationResults">Object containing any validation errors/warnings</param>
    /// <returns>Task to indicate when validation is completed</returns>
    public Task ValidateData(object data, ModelStateDictionary validationResults);

    /// <summary>
    /// Is called to run custom task validation events.
    /// </summary>
    /// <param name="instance">Instance to be validated.</param>
    /// <param name="taskId">Task id for the current process task.</param>
    /// <param name="validationResults">Object containing any validation errors/warnings</param>
    /// <returns>Task to indicate when validation is completed</returns>
    public Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults);
}
