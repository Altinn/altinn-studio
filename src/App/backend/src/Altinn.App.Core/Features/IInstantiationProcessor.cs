using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// IInstantiation defines the methods that must be implemented by a class that handles custom logic during instantiation of a new instance.
/// </summary>
[ImplementableByApps]
public interface IInstantiationProcessor
{
    /// <summary>
    /// Run events related to instantiation
    /// </summary>
    /// <remarks>
    /// For example custom prefill.
    /// </remarks>
    /// <param name="instance">Instance information</param>
    /// <param name="data">The data object created</param>
    /// <param name="prefill">External prefill available under instansiation if supplied</param>
    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill);
}
