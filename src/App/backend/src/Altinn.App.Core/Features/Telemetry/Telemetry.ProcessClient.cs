using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetProcessDefinitionActivity() =>
        LibraryActivitySource.StartActivity("ProcessClient.GetProcessDefinition");

    internal Activity? StartGetProcessHistoryActivity(string? instanceGuid, string? instanceOwnerPartyId)
    {
        var activity = LibraryActivitySource.StartActivity("ProcessClient.GetProcessHistory");
        if (Guid.TryParse(instanceGuid, out Guid instanceId))
        {
            activity?.SetInstanceId(instanceId);
        }

        activity?.SetInstanceOwnerPartyId(instanceOwnerPartyId);
        return activity;
    }
}
