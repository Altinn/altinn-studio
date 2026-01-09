using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Correspondence;
using Tag = System.Collections.Generic.KeyValuePair<string, object?>;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitCorrespondence(InitContext context)
    {
        InitMetricCounter(
            context,
            MetricNameOrder,
            init: static m =>
            {
                foreach (var result in CorrespondenceResultExtensions.GetValues())
                {
                    m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
                }
            }
        );
    }

    internal Activity? StartSendCorrespondenceActivity()
    {
        return ActivitySource.StartActivity("Correspondence.Send");
    }

    internal Activity? StartCorrespondenceStatusActivity(Guid correspondenceId)
    {
        var activity = ActivitySource.StartActivity("Correspondence.Status");
        activity?.AddTag(Labels.CorrespondenceId, correspondenceId);
        return activity;
    }

    internal void RecordCorrespondenceOrder(CorrespondenceResult result) =>
        _counters[MetricNameOrder]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));

    internal static class Correspondence
    {
        internal static readonly string MetricNameOrder = Metrics.CreateLibName("correspondence_orders");

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
