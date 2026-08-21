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
    /// <remarks>
    /// Sends without a reply address, so the recipient's answers cannot be routed back to a waiting service task:
    /// this overload publishes the instance reference in its place. Use the overload taking a <c>replyAddress</c>
    /// for anything whose answer must reach the task that sent it.
    /// </remarks>
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
    /// Generates a message of the given type for the active instance and sends it via Fiks Arkiv, addressed for
    /// its answer.
    /// </summary>
    /// <param name="taskId">The task ID the message is generated from</param>
    /// <param name="messageType">The Fiks Arkiv message type (create, update, etc)</param>
    /// <param name="sendersReference">The caller-provided sender reference used to identify retries of the same message.</param>
    /// <param name="replyAddress">
    /// The address the recipient's answers must be routed back to — for
    /// <see cref="FiksArkivServiceTask"/>, the id of the mailbox its send stage opened
    /// (<c>ServiceTaskContext.Mailbox</c>). It travels as the Fiks IO <c>klientKorrelasjonsId</c>, the
    /// one field Fiks IO echoes back on every reply, so an answer can be delivered into the mailbox the
    /// task is waiting on.
    /// </param>
    /// <param name="executionReferenceTime">The execution reference time, stable across retries.</param>
    /// <param name="dataMutator">The active instance data mutator.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <remarks>
    /// The archive record is staged into the unit of work before the shipment leaves, and a failed send discards it
    /// with the rest of the attempt's data changes — so a record is never left behind for a message that never
    /// went, and a throw between the staging and the send cannot make the retry send a second copy.
    /// </remarks>
    Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        string messageType,
        Guid sendersReference,
        Guid replyAddress,
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
