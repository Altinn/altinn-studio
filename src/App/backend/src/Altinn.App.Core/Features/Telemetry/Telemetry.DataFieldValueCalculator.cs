using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.DataModelFieldCalculator;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartCalculateActivity(string instanceId, string taskId)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.Calculate");
        activity?.SetInstanceId(instanceId);
        activity?.SetTaskId(taskId);
        return activity;
    }

    internal static class DataModelFieldCalculator
    {
        internal const string Prefix = "DataModelFieldCalculator";
    }
}
