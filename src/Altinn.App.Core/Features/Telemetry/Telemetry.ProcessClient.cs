using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetProcessDefinitionActivity() =>
        ActivitySource.StartActivity("ProcessClient.GetProcessDefinition");

    internal Activity? StartGetProcessHistoryActivity(string? instanceGuid, string? instanceOwnerPartyId)
    {
        var activity = ActivitySource.StartActivity("ProcessClient.GetProcessHistory");
        if (Guid.TryParse(instanceGuid, out Guid instanceId))
        {
            activity?.SetInstanceId(instanceId);
        }

        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }
}
