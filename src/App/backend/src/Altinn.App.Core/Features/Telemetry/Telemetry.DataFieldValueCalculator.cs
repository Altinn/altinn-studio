using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Core.Features.Telemetry.DataModelFieldCalculator;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    /// <summary>
    /// One span per data element that has a calculation file, so a write to an app without calculations leaves no
    /// trace. The data type names the file, <c>models/{dataType}.calculation.json</c>.
    /// </summary>
    internal Activity? StartCalculateActivity(
        string instanceId,
        string taskId,
        DataType dataType,
        DataElement dataElement
    )
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Calculate");
        activity?.SetInstanceId(instanceId);
        activity?.SetTaskId(taskId);
        activity?.SetTag(Labels.DataType, dataType.Id);
        activity?.SetDataElementId(dataElement);
        return activity;
    }

    internal static class DataModelFieldCalculator
    {
        internal const string Prefix = "DataModelFieldCalculator";
    }
}
