using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Data;
using Tag = System.Collections.Generic.KeyValuePair<string, object?>;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitData(InitContext context)
    {
        InitMetricCounter(
            context,
            MetricNameDataPatched,
            init: static m =>
            {
                m.Add(0, new Tag(InternalLabels.Result, PatchResult.Success.ToStringFast(useMetadataAttributes: true)));
                m.Add(0, new Tag(InternalLabels.Result, PatchResult.Error.ToStringFast(useMetadataAttributes: true)));
            }
        );
    }

    internal void DataPatched(PatchResult result) =>
        _counters[MetricNameDataPatched]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));

    internal Activity? StartDataPatchActivity(Instance instance)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.Patch");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartDataProcessWriteActivity(IDataProcessor dataProcessor)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.ProcessWrite.{dataProcessor.GetType().Name}");
        return activity;
    }

    internal Activity? StartDataProcessWriteActivity(IDataWriteProcessor dataProcessor)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.ProcessWrite.{dataProcessor.GetType().Name}");
        return activity;
    }

    internal static class Data
    {
        internal const string Prefix = "Data";
        internal static readonly string MetricNameDataPatched = Metrics.CreateLibName("data_patched");

        [EnumExtensions]
        internal enum PatchResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }
}
