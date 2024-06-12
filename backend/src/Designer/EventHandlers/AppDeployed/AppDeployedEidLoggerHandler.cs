using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.TypedHttpClients.EidLogger;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.EventHandlers.AppDeployed;

public class AppDeployedEidLoggerHandler : INotificationHandler<AppDeployedEvent>
{
    private readonly IEidLoggerClient _eidLoggerClient;
    private readonly ILogger<AppDeployedEidLoggerHandler> _logger;

    public AppDeployedEidLoggerHandler(IEidLoggerClient eidLoggerClient, ILogger<AppDeployedEidLoggerHandler> logger)
    {
        _eidLoggerClient = eidLoggerClient;
        _logger = logger;
    }

    public async Task Handle(AppDeployedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            EidLogRequest request = new()
            {
                EventName = "AppDeployed",
                EventCreated = DateTime.UtcNow,
                EventDescription = $"App deployed to {notification.DeployType}",
                StudioData = new Dictionary<string, string>
                {
                    { "org", notification.EditingContext.Org },
                    { "app", notification.EditingContext.Repo },
                    { "studioEnvironment", notification.StudioEnvironment },
                    { "appsEnvironment", notification.AppsEnvironment },
                    { "deployType", notification.DeployType.ToString() },
                }
            };

            await _eidLoggerClient.Log(request);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error logging AppDeployed event to EidLogger for app {org}/{repository}", notification.EditingContext.Org, notification.EditingContext.Repo);
        }
    }
}
