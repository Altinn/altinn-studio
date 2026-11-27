using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.DelegationConst;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitSigningDelegation(InitContext context)
    {
        InitMetricCounter(context, MetricNameDelegation, "{delegation}", "Rights the app delegated to signees.");
        InitMetricCounter(
            context,
            MetricNameDelegationRevoke,
            "{revocation}",
            "Delegations to signees the app revoked."
        );
    }

    internal Activity? StartDelegateSigneeRightsActivity(string taskId)
    {
        Activity? activity = LibraryActivitySource.StartActivity("SigningDelegationService.DelegateSigneeRights");
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal Activity? StartRevokeSigneeRightsActivity(string taskId)
    {
        Activity? activity = LibraryActivitySource.StartActivity("SigningDelegationService.RevokeSigneeRights");
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal void RecordDelegation(DelegationResult result) =>
        _counters[MetricNameDelegation].Add(1, Outcome(failed: result == DelegationResult.Error));

    internal void RecordDelegationRevoke(DelegationResult result) =>
        _counters[MetricNameDelegationRevoke].Add(1, Outcome(failed: result == DelegationResult.Error));

    internal static class DelegationConst
    {
        internal static readonly string MetricNameDelegation = Metrics.CreateLibName("signing.delegations");
        internal static readonly string MetricNameDelegationRevoke = Metrics.CreateLibName(
            "signing.delegation_revocations"
        );

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum DelegationResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }
}
