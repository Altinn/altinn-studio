#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.PolicyAdmin;
using Altinn.Studio.PolicyAdmin.Models;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedPolicyFileHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;
    private readonly IRepository _repository;

    public ProcessTaskIdChangedPolicyFileHandler(IFileSyncHandlerExecutor fileSyncHandlerExecutor,
        IRepository repository)
    {
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
        _repository = repository;
    }

    public async Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        bool hasChanges = false;
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.PolicyFileTaskIdSyncError,
            "App/config/authorization/policy.xml",
            async () =>
            {
                var xacmlPolicy = _repository.GetPolicy(notification.EditingContext.Org,
                    notification.EditingContext.Repo, null);
                var resourcePolicy = PolicyConverter.ConvertPolicy(xacmlPolicy);
                if (TryChangeTaskIds(resourcePolicy, notification.OldId, notification.NewId))
                {
                    xacmlPolicy = PolicyConverter.ConvertPolicy(resourcePolicy);
                    await _repository.SavePolicy(notification.EditingContext.Org, notification.EditingContext.Repo,
                        null, xacmlPolicy);
                    hasChanges = true;
                }

                return hasChanges;
            });
    }

    private static bool TryChangeTaskIds(ResourcePolicy resourcePolicy, string oldId, string newId)
    {
        if (resourcePolicy.Rules is null)
        {
            return false;
        }

        bool hasChanges = false;

        foreach (var rule in resourcePolicy.Rules)
        {
            // Replace the oldId with the newId in the description if it exists
            if (rule.Description is not null && rule.Description.Contains(oldId))
            {
                rule.Description = rule.Description.Replace(oldId, newId);
                hasChanges = true;
            }

            // Skip the rest of the loop if there are no resources
            if (rule.Resources is null)
            {
                continue;
            }

            // Replace the oldId with the newId in each resource list
            foreach (var resources in rule.Resources)
            {
                for (int i = 0; i < resources.Count; i++)
                {
                    if (resources[i] == $"urn:altinn:task:{oldId}")
                    {
                        resources[i] = $"urn:altinn:task:{newId}";
                        hasChanges = true;
                    }
                }
            }
        }

        return hasChanges;
    }
}
