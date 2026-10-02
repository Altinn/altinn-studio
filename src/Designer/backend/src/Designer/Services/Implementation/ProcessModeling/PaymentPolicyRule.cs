using System.Linq;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.PolicyAdmin;
using Altinn.Studio.PolicyAdmin.Models;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling;

// Keep payment defaults aligned with the frontend PaymentPolicyBuilder used by v8 apps.
internal static class PaymentPolicyRule
{
    internal static string RuleId(string org, string app, string taskId) =>
        $"urn:altinn:resource:app_{org}_{app}:policyid:1:ruleid:{taskId}";

    internal static PolicyRule Create(string org, string app, string taskId) =>
        new()
        {
            RuleId = RuleId(org, app, taskId),
            Description =
                $"Rule that defines that user with specified role(s) can pay, reject and confirm for {org}/{app} when it is in payment task",
            Subject = [],
            Actions = ["read", "pay", "confirm", "reject"],
            Resources =
            [
                [$"urn:altinn:org:{org}", $"urn:altinn:app:{app}", $"urn:altinn:task:{taskId}"],
            ],
        };

    internal static XacmlRule CreateXacmlRule(string org, string app, string taskId) =>
        PolicyConverter.ConvertPolicy(new ResourcePolicy { Rules = [Create(org, app, taskId)] }).Rules.Single();
}
