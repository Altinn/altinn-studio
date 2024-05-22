using System.Diagnostics;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartDataListActivity() => ActivitySource.StartActivity("DataList.Get");

    internal Activity? StartDataListActivity(InstanceIdentifier instanceIdentifier)
    {
        var activity = ActivitySource.StartActivity("DataList.GetWithId");
        activity?.SetInstanceId(instanceIdentifier.InstanceGuid);
        return activity;
    }
}
