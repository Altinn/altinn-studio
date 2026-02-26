using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivConfigValidationService : IHostedService
{
    private readonly IProcessReader _processReader;
    private readonly IAppMetadata _appMetadata;

    private readonly IFiksArkivHost _fiksArkivHost;
    private readonly IFiksArkivInstanceClient _fiksArkivInstanceClient;

    public FiksArkivConfigValidationService(
        IFiksArkivHost fiksArkivHost,
        IFiksArkivInstanceClient fiksArkivInstanceClient,
        IProcessReader processReader,
        IAppMetadata appMetadata
    )
    {
        _fiksArkivHost = fiksArkivHost;
        _fiksArkivInstanceClient = fiksArkivInstanceClient;
        _processReader = processReader;
        _appMetadata = appMetadata;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        IReadOnlyList<ProcessTask> processTasks = _processReader.GetProcessTasks();

        await _fiksArkivHost.ValidateConfiguration(appMetadata.DataTypes, processTasks);
        await _fiksArkivInstanceClient.GetServiceOwnerToken(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
