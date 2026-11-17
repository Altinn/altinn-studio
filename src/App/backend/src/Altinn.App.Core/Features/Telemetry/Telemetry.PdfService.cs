using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGeneratePdfActivity(Instance? instance, string? taskId)
    {
        var activity = ActivitySource.StartActivity("PdfService.GeneratePdf");
        activity?.SetInstanceId(instance);
        activity?.SetTaskId(taskId);
        return activity;
    }
}
