using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivConfigValidationService : IHostedService
{
    private readonly IProcessReader _processReader;
    private readonly IAppMetadata _appMetadata;
    private readonly FiksArkivSettings _fiksArkivSettings;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IFiksArkivInstanceClient _fiksArkivInstanceClient;

    public FiksArkivConfigValidationService(
        IOptions<FiksArkivSettings> fiksArkivSettings,
        AppImplementationFactory appImplementationFactory,
        IFiksArkivInstanceClient fiksArkivInstanceClient,
        IProcessReader processReader,
        IAppMetadata appMetadata
    )
    {
        _fiksArkivSettings = fiksArkivSettings.Value;
        _appImplementationFactory = appImplementationFactory;
        _fiksArkivInstanceClient = fiksArkivInstanceClient;
        _processReader = processReader;
        _appMetadata = appMetadata;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        IReadOnlyList<ProcessTask> processTasks = _processReader.GetProcessTasks();

        if (_fiksArkivSettings.Receipt is null)
            throw new FiksArkivConfigurationException(
                $"{nameof(FiksArkivSettings.Receipt)} configuration is required, but missing."
            );

        _fiksArkivSettings.Receipt.Validate(nameof(FiksArkivSettings.Receipt), appMetadata.DataTypes);

        IFiksArkivPayloadGenerator payloadGenerator =
            _appImplementationFactory.GetRequired<IFiksArkivPayloadGenerator>();
        await payloadGenerator.ValidateConfiguration(appMetadata.DataTypes, processTasks);

        await _fiksArkivInstanceClient.GetServiceOwnerToken(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
