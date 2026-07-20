using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Generator for the content of a Fiks Arkiv message request.
/// </summary>
[ImplementableByApps]
public interface IFiksArkivPayloadGenerator
{
    /// <summary>
    /// Generates the content of a Fiks Arkiv message request.
    /// </summary>
    /// <param name="taskId">The task which triggered the sending.</param>
    /// <param name="instance">The instance for which this message relates to.</param>
    /// <param name="recipient">The recipient of this message.</param>
    /// <param name="messageType">The Fiks Arkiv message type (create, update, etc)</param>
    /// <param name="dataAccessor">The active instance data accessor, when the payload is generated from a unit of work.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<IEnumerable<FiksIOMessagePayload>> GeneratePayload(
        string taskId,
        Instance instance,
        FiksArkivRecipient recipient,
        string messageType,
        IInstanceDataAccessor? dataAccessor = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Validates the configuration needed by this payload generator.
    /// </summary>
    /// <param name="configuredDataTypes">All datatypes defined in applicationmetadata.json.</param>
    /// <param name="configuredProcessTasks">All process tasks defined in process.bpmn.</param>
    Task ValidateConfiguration(
        IReadOnlyList<DataType> configuredDataTypes,
        IReadOnlyList<ProcessTask> configuredProcessTasks
    );
}
