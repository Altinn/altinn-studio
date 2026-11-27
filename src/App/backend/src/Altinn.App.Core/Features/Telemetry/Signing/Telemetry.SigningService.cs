using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.NotifySigneesConst;
using static Altinn.App.Core.Features.Telemetry.ServiceOwnerPartyConst;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitSigning(InitContext context)
    {
        InitMetricCounter(context, MetricNameNotifySignees, "{notification}", "Notifications the app sent to signees.");
        InitMetricCounter(
            context,
            MetricNameGetServiceOwnerParty,
            "{lookup}",
            "Lookups of the service owner's party for signing."
        );
    }

    internal void RecordNotifySignees(NotifySigneesResult result) =>
        _counters[MetricNameNotifySignees].Add(1, Outcome(failed: result == NotifySigneesResult.Error));

    internal void RecordGetServiceOwnerParty(ServiceOwnerPartyResult result) =>
        _counters[MetricNameGetServiceOwnerParty].Add(1, Outcome(failed: result == ServiceOwnerPartyResult.Error));

    internal Activity? StartAssignSigneesActivity() =>
        LibraryActivitySource.StartActivity("SigningService.AssignSignees");

    internal Activity? StartReadSigneesActivity() => LibraryActivitySource.StartActivity("SigningService.ReadSignees");

    internal Activity? StartReadAuthorizedSigneesActivity() =>
        LibraryActivitySource.StartActivity("SigningService.ReadAuthorizedSignees");

    internal Activity? StartRemoveSigneeStateActivity() =>
        LibraryActivitySource.StartActivity("SigningService.RemoveSigneeState");

    internal Activity? StartRemoveAllSignaturesActivity(string dataType)
    {
        Activity? activity = LibraryActivitySource.StartActivity("SigningService.RemoveAllSignatures");
        activity?.SetTag(Labels.DataType, dataType);
        return activity;
    }

    internal Activity? StartAbortRuntimeDelegatedSigningActivity(string taskId)
    {
        Activity? activity = LibraryActivitySource.StartActivity("SigningService.AbortRuntimeDelegatedSigning");
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal Activity? StartRevokeSigneeRightsOnTaskEndActivity(string taskId)
    {
        Activity? activity = LibraryActivitySource.StartActivity("SigningService.RevokeSigneeRightsOnTaskEnd");
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal Activity? StartGetServiceOwnerPartyActivity() =>
        LibraryActivitySource.StartActivity("SigningService.GetServiceOwnerParty");

    internal Activity? StartGetInstanceOwnerPartyActivity() =>
        LibraryActivitySource.StartActivity("SigningService.GetInstanceOwnerParty");

    internal static class ServiceOwnerPartyConst
    {
        internal static readonly string MetricNameGetServiceOwnerParty = Metrics.CreateLibName(
            "signing.service_owner_party_lookups"
        );

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum ServiceOwnerPartyResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }

    internal static class NotifySigneesConst
    {
        internal static readonly string MetricNameNotifySignees = Metrics.CreateLibName("signing.signee_notifications");

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum NotifySigneesResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }
}
