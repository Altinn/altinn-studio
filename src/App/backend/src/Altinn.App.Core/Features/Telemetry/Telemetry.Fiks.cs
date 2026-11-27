using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Fiks;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitFiks(InitContext context)
    {
        InitMetricCounter(context, MetricNameMessageSent, "{message}", "Fiks messages the app sent.");
        InitMetricCounter(context, MetricNameMessageReceived, "{message}", "Fiks messages the app received.");
    }

    internal Activity? StartSendFiksActivity(
        Guid fiksRecipient,
        string fiksMessageType,
        Guid sendersReference,
        Guid? inReplyToMessage,
        string? correlationId
    )
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Send");
        activity?.AddTag(Labels.FiksMessageRecipient, fiksRecipient);
        activity?.AddTag(Labels.FiksMessageType, fiksMessageType);
        activity?.AddTag(Labels.FiksSendersReference, sendersReference);
        activity?.AddTag(Labels.FiksInReplyToMessage, inReplyToMessage);
        activity?.AddTag(Labels.FiksMessageCorrelationId, correlationId);

        return activity;
    }

    internal Activity? StartGenerateAndSendFiksActivity(string taskId, Instance instance, string fiksMessageType)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.GenerateAndSend");
        activity?.SetInstanceId(instance);
        activity?.AddTag(Labels.TaskId, taskId);
        activity?.AddTag(Labels.FiksMessageType, fiksMessageType);

        return activity;
    }

    internal Activity? StartReceiveFiksActivity(
        Guid fiksSender,
        Guid fiksMessageId,
        string fiksMessageType,
        Guid? sendersReference,
        Guid? inReplyToMessage,
        string? correlationId
    )
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.Receive");
        activity?.AddTag(Labels.FiksMessageSender, fiksSender);
        activity?.AddTag(Labels.FiksMessageId, fiksMessageId);
        activity?.AddTag(Labels.FiksMessageType, fiksMessageType);
        activity?.AddTag(Labels.FiksSendersReference, sendersReference);
        activity?.AddTag(Labels.FiksInReplyToMessage, inReplyToMessage);
        activity?.AddTag(Labels.FiksMessageCorrelationId, correlationId);

        return activity;
    }

    internal void RecordFiksMessageSent(FiksResult result) =>
        _counters[MetricNameMessageSent].Add(1, Outcome(failed: result == FiksResult.Error));

    internal void RecordFiksMessageReceived(FiksResult result) =>
        _counters[MetricNameMessageReceived].Add(1, Outcome(failed: result == FiksResult.Error));

    internal static class Fiks
    {
        internal const string Prefix = "Fiks";

        internal static readonly string MetricNameMessageSent = Metrics.CreateLibName("fiks.messages.sent");
        internal static readonly string MetricNameMessageReceived = Metrics.CreateLibName("fiks.messages.received");

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
        internal enum FiksResult
        {
            [Display(Name = "success")]
            Success,

            [Display(Name = "error")]
            Error,
        }
    }
}
