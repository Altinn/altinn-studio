using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Fiks;
using Tag = System.Collections.Generic.KeyValuePair<string, object?>;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitFiks(InitContext context)
    {
        string[] metrics = [MetricNameMessageSent, MetricNameMessageReceived];

        foreach (var metric in metrics)
        {
            InitMetricCounter(
                context,
                metric,
                init: static m =>
                {
                    foreach (var result in FiksResultExtensions.GetValues())
                    {
                        m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
                    }
                }
            );
        }
    }

    internal Activity? StartSendFiksActivity(
        Guid fiksRecipient,
        string fiksMessageType,
        Guid sendersReference,
        Guid? inReplyToMessage,
        string? correlationId
    )
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.Send");
        activity?.AddTag(Labels.FiksMessageRecipient, fiksRecipient);
        activity?.AddTag(Labels.FiksMessageType, fiksMessageType);
        activity?.AddTag(Labels.FiksSendersReference, sendersReference);
        activity?.AddTag(Labels.FiksInReplyToMessage, inReplyToMessage);
        activity?.AddTag(Labels.FiksMessageCorrelationId, correlationId);

        return activity;
    }

    internal Activity? StartGenerateAndSendFiksActivity(string taskId, Instance instance, string fiksMessageType)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.GenerateAndSend");
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
        var activity = ActivitySource.StartActivity($"{Prefix}.Receive");
        activity?.AddTag(Labels.FiksMessageSender, fiksSender);
        activity?.AddTag(Labels.FiksMessageId, fiksMessageId);
        activity?.AddTag(Labels.FiksMessageType, fiksMessageType);
        activity?.AddTag(Labels.FiksSendersReference, sendersReference);
        activity?.AddTag(Labels.FiksInReplyToMessage, inReplyToMessage);
        activity?.AddTag(Labels.FiksMessageCorrelationId, correlationId);

        return activity;
    }

    internal Activity? StartFiksMessageHandlerActivity(Instance instance, Type messageHandlerType)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.MessageHandler.{messageHandlerType}");
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal void RecordFiksMessageSent(FiksResult result) =>
        _counters[MetricNameMessageSent]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));

    internal void RecordFiksMessageReceived(FiksResult result) =>
        _counters[MetricNameMessageReceived]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));

    internal static class Fiks
    {
        internal const string Prefix = "Fiks";

        internal static readonly string MetricNameMessageSent = Metrics.CreateLibName("fiks_messages_sent");
        internal static readonly string MetricNameMessageReceived = Metrics.CreateLibName("fiks_messages_received");

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
