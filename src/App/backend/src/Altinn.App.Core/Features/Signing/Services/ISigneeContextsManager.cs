using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Signing.Services;

internal interface ISigneeContextsManager
{
    /// <summary>
    /// Creates the signee contexts for the current task by consulting the app's signee provider and looking up
    /// each signee's party. Every state flag starts unset.
    /// </summary>
    Task<List<SigneeContext>> GenerateSigneeContexts(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    );

    /// <summary>
    /// Gets the signee contexts for the current task.
    /// </summary>
    Task<List<SigneeContext>> GetSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    );

    /// <summary>
    /// The signee-state element created for the given task by this transition, if the instance data holds one:
    /// an element of the signee-state data type tagged <c>generatedFrom</c> the task. Null when there is none.
    /// </summary>
    DataElement? FindTaskSigneeStateElement(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId
    );

    /// <summary>
    /// Looks in Storage for a signee-state element tagged with the task that the callback state does not know
    /// about — the element a previous attempt of the same step created before its response was lost — and adds
    /// it to the instance data so it is reused instead of duplicated. Null when Storage has none either.
    /// </summary>
    Task<DataElement?> AdoptTaskSigneeStateElementFromStorage(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        CancellationToken ct
    );

    /// <summary>
    /// Removes every signee-state element that is not tagged with the given task: elements from before the
    /// state was tagged, or tagged with another task. Initialisation must start from a clean slate however the
    /// task was reached.
    /// </summary>
    void RemoveOtherSigneeStateElements(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId
    );

    /// <summary>
    /// Reads the signee contexts persisted in the given element.
    /// </summary>
    Task<List<SigneeContext>> LoadSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        DataElement signeeStateDataElement
    );

    /// <summary>
    /// Persists the signee contexts as the task's signee-state element: updates the element tagged with the task
    /// when one exists, else adds one tagged <c>generatedFrom</c> the task.
    /// </summary>
    Task PersistSigneeContexts(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        List<SigneeContext> signeeContexts
    );
}
