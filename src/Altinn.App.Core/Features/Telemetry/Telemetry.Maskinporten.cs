using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Maskinporten;
using Tag = System.Collections.Generic.KeyValuePair<string, object?>;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitMaskinporten(InitContext context)
    {
        InitMetricCounter(
            context,
            MetricNameTokenRequest,
            init: static m =>
            {
                foreach (var result in RequestResultExtensions.GetValues())
                {
                    m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast()));
                }
            }
        );
    }

    internal Activity? StartGetAccessTokenActivity(string clientId, string scopes)
    {
        var activity = ActivitySource.StartActivity("Maskinporten.GetAccessToken");
        activity?.SetTag("maskinporten.scopes", scopes);
        activity?.SetTag("maskinporten.client_id", clientId);
        return activity;
    }

    internal void RecordMaskinportenTokenRequest(RequestResult result)
    {
        _counters[MetricNameTokenRequest].Add(1, new Tag(InternalLabels.Result, result.ToStringFast()));
    }

    internal static class Maskinporten
    {
        internal static readonly string MetricNameTokenRequest = Metrics.CreateLibName("maskinporten_token_requests");

        [EnumExtensions]
        internal enum RequestResult
        {
            [Display(Name = "cached")]
            Cached,

            [Display(Name = "new")]
            New,

            [Display(Name = "error")]
            Error,
        }
    }
}
