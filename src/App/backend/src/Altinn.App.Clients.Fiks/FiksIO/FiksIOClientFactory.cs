using Altinn.App.Core.Features.Maskinporten;
using Microsoft.Extensions.Logging;
using ExternalFiksIOClient = KS.Fiks.IO.Client.FiksIOClient;
using ExternalFiksIOConfiguration = KS.Fiks.IO.Client.Configuration.FiksIOConfiguration;
using IExternalFiksIOClient = KS.Fiks.IO.Client.IFiksIOClient;

namespace Altinn.App.Clients.Fiks.FiksIO;

internal sealed class FiksIOClientFactory : IFiksIOClientFactory
{
    private readonly ILoggerFactory _loggerFactory;
    private readonly IMaskinportenClient _maskinportenClient;

    public FiksIOClientFactory(ILoggerFactory loggerFactory, IMaskinportenClient maskinportenClient)
    {
        _loggerFactory = loggerFactory;
        _maskinportenClient = maskinportenClient;
    }

    public async Task<IExternalFiksIOClient> CreateClient(ExternalFiksIOConfiguration fiksConfiguration) =>
        await ExternalFiksIOClient.CreateAsync(
            configuration: fiksConfiguration,
            maskinportenClient: new FiksIOMaskinportenClient(_maskinportenClient),
            loggerFactory: _loggerFactory
        );
}
