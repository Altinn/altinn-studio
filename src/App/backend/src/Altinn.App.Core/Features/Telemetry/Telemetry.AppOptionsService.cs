using System.Diagnostics;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetOptionsActivity() => ActivitySource.StartActivity("AppOptionsService.GetOptions");

    internal Activity? StartGetOptionsActivity(InstanceIdentifier instanceIdentifier)
    {
        var activity = ActivitySource.StartActivity("AppOptionsService.GetOptions");
        activity?.SetInstanceId(instanceIdentifier.InstanceGuid);
        return activity;
    }
}
