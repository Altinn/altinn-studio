#nullable disable
using System;
using System.Text.RegularExpressions;
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

    public ProcessTaskIdChangedPolicyFileHandler(
        IFileSyncHandlerExecutor fileSyncHandlerExecutor,
        IRepository repository
    )
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
                var xacmlPolicy = _repository.GetPolicy(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    null
                );
                var resourcePolicy = PolicyConverter.ConvertPolicy(xacmlPolicy);
                if (TryChangeTaskIds(resourcePolicy, notification.OldId, notification.NewId))
                {
                    xacmlPolicy = PolicyConverter.ConvertPolicy(resourcePolicy);
                    await _repository.SavePolicy(
                        notification.EditingContext.Org,
                        notification.EditingContext.Repo,
                        null,
                        xacmlPolicy
                    );
                    hasChanges = true;
                }

                return hasChanges;
            }
        );
    }

    /// <summary>
    /// Rule ids generated for a task embed the task id as their last segment, after ":ruleid:".
    /// See PaymentPolicyBuilder in the frontend, which both creates these rules and looks them up by
    /// the id it rebuilds from the current task id.
    /// </summary>
    private const string RuleIdTaskSegmentPrefix = ":ruleid:";

    private static bool TryChangeTaskIds(ResourcePolicy resourcePolicy, string oldId, string newId)
    {
        if (resourcePolicy.Rules is null)
        {
            return false;
        }

        bool hasChanges = false;

        foreach (var rule in resourcePolicy.Rules)
        {
            // Replace the task id segment of the rule id, leaving any other occurrence of the old id alone
            if (
                rule.RuleId is not null
                && rule.RuleId.EndsWith($"{RuleIdTaskSegmentPrefix}{oldId}", StringComparison.Ordinal)
            )
            {
                rule.RuleId = string.Concat(rule.RuleId.AsSpan(0, rule.RuleId.Length - oldId.Length), newId);
                hasChanges = true;
            }

            // Replace whole-word occurrences of the oldId in the description. A plain Replace would
            // rewrite the "Task_1" inside a mention of "Task_10"; '_' and digits are word characters,
            // so the word boundaries keep the match to the id itself.
            if (rule.Description is not null)
            {
                string updatedDescription = Regex.Replace(
                    rule.Description,
                    $@"\b{Regex.Escape(oldId)}\b",
                    newId.Replace("$", "$$")
                );
                if (!string.Equals(updatedDescription, rule.Description, StringComparison.Ordinal))
                {
                    rule.Description = updatedDescription;
                    hasChanges = true;
                }
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
