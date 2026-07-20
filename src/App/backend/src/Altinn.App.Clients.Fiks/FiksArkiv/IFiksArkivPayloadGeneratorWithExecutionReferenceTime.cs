using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal interface IFiksArkivPayloadGeneratorWithExecutionReferenceTime
{
    Task<IEnumerable<FiksIOMessagePayload>> GeneratePayload(
        string taskId,
        Instance instance,
        FiksArkivRecipient recipient,
        string messageType,
        DateTimeOffset executionReferenceTime,
        IInstanceDataAccessor? dataAccessor = null,
        CancellationToken cancellationToken = default
    );
}
