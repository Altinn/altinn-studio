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
    /// <param name="prefill">External prefill available under instantiation if supplied</param>
    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill);

    /// <summary>
    /// Run events related to instantiation, with access to the mutator that is creating the data element
    /// </summary>
    /// <remarks>
    /// <para>
    /// Prefer this overload. Data elements added through <paramref name="instanceDataMutator"/> are committed
    /// together with the task's own aggregate save, whereas the instance rejects direct writes through
    /// <see cref="Altinn.App.Core.Internal.Data.IDataClient"/> while its process is transitioning.
    /// </para>
    /// <para>
    /// The default implementation forwards to <see cref="DataCreation(Instance, object, Dictionary{string, string})"/>
    /// with <see cref="IInstanceDataAccessor.Instance"/>, so existing implementations keep working unchanged.
    /// </para>
    /// </remarks>
    /// <param name="instanceDataMutator">Mutator for the instance the data object is created on</param>
    /// <param name="data">The data object created</param>
    /// <param name="prefill">External prefill available under instantiation if supplied</param>
    public Task DataCreation(
        IInstanceDataMutator instanceDataMutator,
        object data,
        Dictionary<string, string>? prefill
    ) => DataCreation(instanceDataMutator.Instance, data, prefill);
}
