using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartAddEventActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity("EventClient.GetAsyncWithId");
        activity?.SetInstanceId(instance);
        return activity;
    }
}
