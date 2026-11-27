using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Correspondence;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitCorrespondence(InitContext context) =>
        InitMetricCounter(context, MetricNameOrder, "{correspondence}", "Correspondences the app sent.");

    internal Activity? StartSendCorrespondenceActivity()
    {
        return LibraryActivitySource.StartActivity("Correspondence.Send");
    }

    internal Activity? StartCorrespondenceStatusActivity(Guid correspondenceId)
    {
        var activity = LibraryActivitySource.StartActivity("Correspondence.Status");
        activity?.AddTag(Labels.CorrespondenceId, correspondenceId);
        return activity;
    }

    internal void RecordCorrespondenceOrder(CorrespondenceResult result) =>
        _counters[MetricNameOrder].Add(1, Outcome(failed: result == CorrespondenceResult.Error));

    internal static class Correspondence
    {
        internal static readonly string MetricNameOrder = Metrics.CreateLibName("correspondence.orders");

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum CorrespondenceResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }
}
