#nullable disable
using System.Linq;
using System.Threading;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessDataTypeChanged;

public class ProcessDataTypesChangedLayoutSettingsHandler : INotificationHandler<ProcessDataTypesChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;
    private readonly IAppVersionService _appVersionService;

    public ProcessDataTypesChangedLayoutSettingsHandler(
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor,
        IAppVersionService appVersionService
    )
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
        _appVersionService = appVersionService;
    }

    public async Task Handle(ProcessDataTypesChangedEvent notification, CancellationToken cancellationToken)
    {
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSettingsDataTypeSyncError,
            $"App/ui/{notification.ConnectedTaskId}/Settings.json",
            async () =>
            {
                if (_appVersionService.GetAppLibVersion(notification.EditingContext).Major < 9)
                {
                    return false;
                }

                AltinnAppGitRepository repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer
                );

                LayoutSettings layoutSettings = await repository.GetLayoutSettings(
                    notification.ConnectedTaskId,
                    cancellationToken
                );

                string newDataType = notification.NewDataTypes.FirstOrDefault();
                if (layoutSettings.DefaultDataType == newDataType)
                {
                    return false;
                }

                layoutSettings.DefaultDataType = newDataType;
                await repository.SaveLayoutSettings(notification.ConnectedTaskId, layoutSettings);
                return true;
            }
        );
    }
}
