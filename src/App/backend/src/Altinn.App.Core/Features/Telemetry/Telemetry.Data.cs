using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Data;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitData(InitContext context) =>
        InitMetricCounter(context, MetricNameDataPatched, "{patch}", "Patches applied to an instance's data.");

    internal void DataPatched(PatchResult result) =>
        _counters[MetricNameDataPatched].Add(1, Outcome(failed: result == PatchResult.Error));

    internal Activity? StartDataPatchActivity(Instance instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Patch");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartDataProcessWriteActivity(IDataProcessor dataProcessor)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.ProcessWrite.{dataProcessor.GetType().Name}");
        return activity;
    }

    internal Activity? StartDataProcessWriteActivity(IDataWriteProcessor dataProcessor)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.ProcessWrite.{dataProcessor.GetType().Name}");
        return activity;
    }

    internal static class Data
    {
        internal const string Prefix = "Data";
        internal static readonly string MetricNameDataPatched = Metrics.CreateLibName("data.patched");

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum PatchResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }
}
