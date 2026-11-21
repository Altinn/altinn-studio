namespace Altinn.App.Core.Features;

/// <summary>
/// IInstantiation defines the methods that must be implemented by a class that handles custom logic during instantiation of a new instance.
/// </summary>
[ImplementableByApps]
public interface IInstantiationProcessor
{
    /// <summary>
    /// Run events related to instantiation, with access to the mutator that is creating the data element
    /// </summary>
    /// <remarks>
    /// <para>
    /// For example custom prefill. Called for each form data element the app creates: when a task starts, when the
    /// instance is created with data, when a data element is added, and when an instance is copied.
    /// </para>
    /// <para>
    /// Add or change data through <paramref name="instanceDataMutator"/>: its changes are saved together with the
    /// data element being created, whereas the instance rejects direct writes through
    /// <see cref="Altinn.App.Core.Internal.Data.IDataClient"/> while its process is transitioning.
    /// </para>
    /// </remarks>
    /// <param name="instanceDataMutator">Mutator for the instance the data object is created on</param>
    /// <param name="data">The data object created</param>
    /// <param name="prefill">External prefill available under instantiation if supplied</param>
    public Task DataCreation(
        IInstanceDataMutator instanceDataMutator,
        object data,
        Dictionary<string, string>? prefill
    );
}
