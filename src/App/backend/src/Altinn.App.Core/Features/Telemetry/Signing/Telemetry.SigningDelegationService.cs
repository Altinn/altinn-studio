using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.DelegationConst;
using Tag = System.Collections.Generic.KeyValuePair<string, object?>;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    /// <summary>
    /// Prometheus' increase and rate functions do not register the first value as an increase, but rather as the registration.<br/>
    /// This means that going from none (non-existant) to 1 on a counter will register as an increase of 0.<br/>
    /// In order to work around this, we initialize to 0 for all metrics here.<br/>
    /// Github issue can be found <a href="https://github.com/prometheus/prometheus/issues/3806">here</a>.
    /// </summary>
    /// <param name="context"></param>
    private void InitSigningDelegation(InitContext context)
    {
        InitMetricCounter(
            context,
            MetricNameDelegation,
            init: static m =>
            {
                foreach (var result in DelegationResultExtensions.GetValues())
                {
                    m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
                }
            }
        );

        InitMetricCounter(
            context,
            MetricNameDelegationRevoke,
            init: static m =>
            {
                foreach (var result in DelegationResultExtensions.GetValues())
                {
                    m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
                }
            }
        );
    }

    internal Activity? StartDelegateSigneeRightsActivity(string taskId)
    {
        Activity? activity = ActivitySource.StartActivity("SigningDelegationService.DelegateSigneeRights");
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal Activity? StartRevokeSigneeRightsActivity(string taskId)
    {
        Activity? activity = ActivitySource.StartActivity("SigningDelegationService.RevokeSigneeRights");
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal void RecordDelegation(DelegationResult result) =>
        _counters[MetricNameDelegation]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));

    internal void RecordDelegationRevoke(DelegationResult result) =>
        _counters[MetricNameDelegationRevoke]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));

    internal static class DelegationConst
    {
        internal static readonly string MetricNameDelegation = Metrics.CreateLibName("signing_delegations");
        internal static readonly string MetricNameDelegationRevoke = Metrics.CreateLibName(
            "signing_delegation_revokes"
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
