using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Orchestrator of the sending and receiving of messages via Fiks Arkiv.
/// </summary>
public interface IFiksArkivHost
{
    /// <summary>
    /// Generates a message of the given type for the active instance and sends it via Fiks Arkiv.
    /// The content of the message is generated using the configured <see cref="IFiksArkivPayloadGenerator"/>,
    /// which must be capable of generating the given message type.
    /// </summary>
    /// <param name="taskId">The task ID the message is generated from</param>
    /// <param name="messageType">The Fiks Arkiv message type (create, update, etc)</param>
    /// <param name="sendersReference">The caller-provided sender reference used to identify retries of the same message.</param>
    /// <param name="executionReferenceTime">The execution reference time, stable across retries.</param>
    /// <param name="dataMutator">The active instance data mutator.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        string messageType,
        Guid sendersReference,
        DateTimeOffset executionReferenceTime,
        IInstanceDataMutator dataMutator,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Validates the configuration of the FIKS Arkiv client.
    /// </summary>
    /// <param name="configuredDataTypes">All datatypes defined in applicationmetadata.json.</param>
    /// <param name="configuredProcessTasks">All process tasks defined in process.bpmn.</param>
    Task ValidateConfiguration(
        IReadOnlyList<DataType> configuredDataTypes,
        IReadOnlyList<ProcessTask> configuredProcessTasks
    );
}
