using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.DataProcessing;

/// <summary>
/// Default implementation of the IInstantiationProcessor interface.
/// This implementation does not do any thing to the data
/// </summary>
public class NullInstantiationProcessor : IInstantiationProcessor
{
    /// <inheritdoc />
    public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
    {
        await Task.CompletedTask;
    }
}
