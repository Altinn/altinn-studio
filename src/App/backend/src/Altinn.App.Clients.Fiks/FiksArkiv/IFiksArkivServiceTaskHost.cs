using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal interface IFiksArkivServiceTaskHost
{
    Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        Instance instance,
        string messageType,
        Guid sendersReference,
        DateTimeOffset executionReferenceTime,
        IInstanceDataMutator dataMutator,
        CancellationToken cancellationToken = default
    );
}
