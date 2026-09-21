using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
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

        ValidateProcessShape(processTasks);

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

    /// <summary>
    /// A Fiks Arkiv task always moves the process on when it concludes: with the configured success action
    /// when the archive confirms the record, and with the error action (<c>reject</c> by default) when the
    /// archiving cannot succeed. Only an exclusive gateway right after the task can tell those two outcomes
    /// apart, so a task that flows straight into the next element would route a rejected archiving exactly
    /// like a confirmed one, silently. Refusing to start is the loud alternative.
    /// </summary>
    private void ValidateProcessShape(IReadOnlyList<ProcessTask> processTasks)
    {
        string errorAction =
            _fiksArkivSettings.ErrorHandling?.GetActionOrDefault() ?? FiksArkivErrorHandlingSettings.DefaultAction;

        foreach (ProcessTask task in processTasks)
        {
            if (
                !string.Equals(
                    task.ExtensionElements?.TaskExtension?.TaskType,
                    AltinnTaskTypes.FiksArkiv,
                    StringComparison.Ordinal
                )
            )
                continue;

            List<ProcessElement> next = _processReader.GetNextElements(task.Id);
            List<ExclusiveGateway> gateways = next.OfType<ExclusiveGateway>().ToList();
            if (next.Count == 0 || gateways.Count != next.Count)
                throw new FiksArkivConfigurationException(
                    $"The Fiks Arkiv task '{task.Id}' must be followed by an exclusive gateway. The task always "
                        + "moves the process on when it concludes: with the success action when the archive confirms "
                        + $"the record, and with '{errorAction}' when the archiving cannot succeed. The gateway is where "
                        + "those two paths diverge; without one, a rejected archiving would follow the same flow as a "
                        + "confirmed one."
                );

            foreach (ExclusiveGateway gateway in gateways)
            {
                if (_processReader.GetOutgoingSequenceFlows(gateway).Count < 2)
                    throw new FiksArkivConfigurationException(
                        $"The exclusive gateway '{gateway.Id}' after the Fiks Arkiv task '{task.Id}' needs at least "
                            + $"two outgoing sequence flows: one for a confirmed archiving and one for the '{errorAction}' "
                            + "action."
                    );
            }
        }
    }
}
