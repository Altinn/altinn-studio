using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.TypedHttpClients.EidLogger;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.FeatureManagement;

namespace Altinn.Studio.Designer.EventHandlers.AppDeployed;

public class AppDeployedEidLoggerHandler : INotificationHandler<AppDeployedEvent>
{
    private readonly IEidLoggerClient _eidLoggerClient;
    private readonly ILogger<AppDeployedEidLoggerHandler> _logger;
    private readonly IWebHostEnvironment _hostingEnvironment;
    private readonly IFeatureManager _featureManager;

    public AppDeployedEidLoggerHandler(IEidLoggerClient eidLoggerClient, ILogger<AppDeployedEidLoggerHandler> logger, IWebHostEnvironment hostingEnvironment, IFeatureManager featureManager)
    {
        _eidLoggerClient = eidLoggerClient;
        _logger = logger;
        _hostingEnvironment = hostingEnvironment;
        _featureManager = featureManager;
    }

    public async Task Handle(AppDeployedEvent notification, CancellationToken cancellationToken)
    {
        if (await _featureManager.IsEnabledAsync(StudioFeatureFlags.EidLogging) == false)
        {
            return;
        }

        EidLogRequest request = new()
        {
            EventName = "AppDeployed",
            EventCreated = DateTime.UtcNow,
            EventDescription = $"App deployed to {notification.DeployType}",
            StudioData = new Dictionary<string, string>
            {
                { "org", notification.EditingContext.Org },
                { "app", notification.EditingContext.Repo },
                { "studioEnvironment", _hostingEnvironment.EnvironmentName },
                { "appsEnvironment", notification.AppsEnvironment },
                { "deployType", notification.DeployType.ToString() },
            }
        };

        try
        {
            await _eidLoggerClient.Log(request);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error logging AppDeployed event to EidLogger for app {org}/{repository}", notification.EditingContext.Org, notification.EditingContext.Repo);
        }
    }
}
