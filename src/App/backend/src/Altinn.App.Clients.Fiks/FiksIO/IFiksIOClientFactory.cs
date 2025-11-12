using ExternalFiksIOConfiguration = KS.Fiks.IO.Client.Configuration.FiksIOConfiguration;
using IExternalFiksIOClient = KS.Fiks.IO.Client.IFiksIOClient;

namespace Altinn.App.Clients.Fiks.FiksIO;

internal interface IFiksIOClientFactory
{
    Task<IExternalFiksIOClient> CreateClient(ExternalFiksIOConfiguration fiksConfiguration);
}
