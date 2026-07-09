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
    /// Generates a message of the given type for the given instance and sends it via Fiks Arkiv.
    /// The content of the message is generated using the configured <see cref="IFiksArkivPayloadGenerator"/>,
    /// which must be capable of generating the given message type.
    /// </summary>
    /// <param name="taskId">The task ID the message is generated from</param>
    /// <param name="instance">The instance the message relates to</param>
    /// <param name="messageType">The Fiks Arkiv message type (create, update, etc)</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        Instance instance,
        string messageType,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Stages the generated archive record on the active unit of work before the message is sent.
    /// </summary>
    /// <param name="taskId">The task ID the message is generated from</param>
    /// <param name="instance">The instance the message relates to</param>
    /// <param name="messageType">The Fiks Arkiv message type (create, update, etc)</param>
    /// <param name="dataMutator">The active instance data mutator.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task StageArchiveRecordForMessage(
        string taskId,
        Instance instance,
        string messageType,
        IInstanceDataMutator dataMutator,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends a message whose archive record was staged and committed through the active unit of work.
    /// </summary>
    /// <param name="taskId">The task ID the message is generated from</param>
    /// <param name="instance">The instance the message relates to</param>
    /// <param name="messageType">The Fiks Arkiv message type (create, update, etc)</param>
    /// <param name="dataAccessor">The active instance data accessor.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<FiksIOMessageResponse> SendStagedMessage(
        string taskId,
        Instance instance,
        string messageType,
        IInstanceDataAccessor dataAccessor,
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
