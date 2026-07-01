using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Outcome of an app-side <c>process/next</c> call against a parked service task.
/// </summary>
internal enum FiksArkivProcessNextOutcome
{
    /// <summary>
    /// The process advanced to the next task.
    /// </summary>
    Advanced,

    /// <summary>
    /// The current task's workflow is still being processed by the workflow engine (409 <c>retrying</c>).
    /// The caller should retry later.
    /// </summary>
    Retrying,

    /// <summary>
    /// The current task's workflow has failed and must be resumed before it can continue (409 <c>resumeRequired</c>).
    /// </summary>
    ResumeRequired,
}

internal interface IFiksArkivInstanceClient
{
    /// <summary>
    /// Generates a <see cref="AuthenticationMethod.ServiceOwner()"/> JWT token.
    /// </summary>
    internal Task<JwtToken> GetServiceOwnerToken(CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches the instance identified by the given <see cref="InstanceIdentifier"/>.
    /// </summary>
    Task<Instance> GetInstance(InstanceIdentifier instanceIdentifier, CancellationToken cancellationToken = default);

    /// <summary>
    /// Moves the instance to the next process task, with a given action. Returns the outcome so callers can
    /// distinguish a successful advance from the workflow-engine "retrying"/"resumeRequired" conflict states.
    /// </summary>
    Task<FiksArkivProcessNextOutcome> ProcessMoveNext(
        InstanceIdentifier instanceIdentifier,
        string? action = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Resumes the failed workflow that established the instance's current task (cascade resume / self-heal).
    /// </summary>
    Task ProcessResume(InstanceIdentifier instanceIdentifier, CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks the instance as complete by the service owner.
    /// </summary>
    Task MarkInstanceComplete(InstanceIdentifier instanceIdentifier, CancellationToken cancellationToken = default);

    /// <summary>
    /// Inserts binary data of a given type into the instance's data elements.
    /// </summary>
    Task<DataElement> InsertBinaryData<TContent>(
        InstanceIdentifier instanceIdentifier,
        string dataType,
        string contentType,
        string filename,
        TContent content,
        string? generatedFromTask = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes binary data from the instance's data elements.
    /// </summary>
    Task DeleteBinaryData(
        InstanceIdentifier instanceIdentifier,
        Guid dataElementGuid,
        CancellationToken cancellationToken = default
    );
}
