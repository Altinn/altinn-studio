using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.App.Core.Features.Validation;

/// <summary>
/// Default implementation of the IInstanceValidator interface.
/// This implementation does not do any validation and always returns true.
/// </summary>
public class NullInstanceValidator: IInstanceValidator
{
    /// <inheritdoc />
    public async Task ValidateData(object data, ModelStateDictionary validationResults)
    {
        await Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
    {
        await Task.CompletedTask;
    }
}