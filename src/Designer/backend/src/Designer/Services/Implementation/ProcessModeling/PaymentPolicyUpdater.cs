using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling;

internal sealed class PaymentPolicyUpdater(IRepository policyRepository, IAppTemplateCatalog appTemplateCatalog)
{
    internal async Task<string> ReadDefaultPolicy(CancellationToken cancellationToken)
    {
        string? templatePolicyPath = appTemplateCatalog.TryGetAppTemplate(AppTemplate.V9Id, out AppTemplate? template)
            ? Path.Combine(template.RootPath, ProcessStateVersion.PolicyPath)
            : null;
        if (templatePolicyPath is null || !File.Exists(templatePolicyPath))
        {
            throw new InvalidOperationException("The default authorization policy of the v9 app template is missing.");
        }
        return await File.ReadAllTextAsync(templatePolicyPath, cancellationToken);
    }

    internal async Task UpdatePaymentRules(
        AltinnRepoEditingContext editingContext,
        AltinnAppGitRepository repository,
        IReadOnlyCollection<string> addedTaskIds,
        IReadOnlyCollection<string> removedTaskIds,
        string? defaultPolicy
    )
    {
        if (addedTaskIds.Count == 0 && removedTaskIds.Count == 0)
        {
            return;
        }
        string org = editingContext.Org;
        string app = editingContext.Repo;
        XacmlPolicy? policy = policyRepository.GetPolicy(org, app, null);
        if (policy is null)
        {
            if (defaultPolicy is null)
            {
                return;
            }
            await repository.WriteTextByRelativePathAsync(
                ProcessStateVersion.PolicyPath,
                defaultPolicy,
                createDirectory: true,
                CancellationToken.None
            );
            policy =
                policyRepository.GetPolicy(org, app, null)
                ?? throw new InvalidOperationException("The default authorization policy was not found once written.");
        }

        HashSet<string> removedRuleIds =
        [
            .. removedTaskIds.Select(taskId => PaymentPolicyRule.RuleId(org, app, taskId)),
        ];
        // Preserve customized rules whose IDs no longer match the generated rule ID.
        XacmlRule[] removedRules = [.. policy.Rules.Where(rule => removedRuleIds.Contains(rule.RuleId))];
        foreach (XacmlRule rule in removedRules)
        {
            policy.Rules.Remove(rule);
        }
        bool changed = removedRules.Length > 0;
        foreach (string taskId in addedTaskIds)
        {
            string ruleId = PaymentPolicyRule.RuleId(org, app, taskId);
            if (policy.Rules.Any(rule => rule.RuleId == ruleId))
            {
                continue;
            }
            policy.Rules.Add(PaymentPolicyRule.CreateXacmlRule(org, app, taskId));
            changed = true;
        }
        if (changed)
        {
            await policyRepository.SavePolicy(org, app, null, policy);
        }
    }
}
