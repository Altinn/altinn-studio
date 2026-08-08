using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
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
                    m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
                }
            }
        );
        InitMetricCounter(
            context,
            MetricNameTokenExchangeRequest,
            init: static m =>
            {
                foreach (var result in RequestResultExtensions.GetValues())
                {
                    m.Add(0, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
                }
            }
        );
    }

    internal Activity? StartGetAccessTokenActivity(string variant, string clientId, MaskinportenTokenRequest request)
    {
        var activity = ActivitySource.StartActivity("Maskinporten.GetAccessToken");
        SetRequestTags(activity, variant, clientId, request);
        return activity;
    }

    internal Activity? StartGetAltinnExchangedAccessTokenActivity(
        string variant,
        string clientId,
        MaskinportenTokenRequest request
    )
    {
        var activity = ActivitySource.StartActivity("Maskinporten.GetAltinnExchangedAccessToken");
        SetRequestTags(activity, variant, clientId, request);
        return activity;
    }

    private static void SetRequestTags(
        Activity? activity,
        string variant,
        string clientId,
        MaskinportenTokenRequest request
    )
    {
        if (activity is null)
            return;

        activity.SetTag("maskinporten.variant", variant);
        activity.SetTag("maskinporten.scopes", request.FormattedScopes);
        activity.SetTag("maskinporten.client_id", clientId);

        if (request.ConsumerOrg is { } consumerOrg)
            activity.SetTag("maskinporten.consumer_org", consumerOrg.Get(OrganizationNumberFormat.Local));

        if (request.Resource is { } resource)
            activity.SetTag("maskinporten.resource", resource);

        if (request.SystemUser is { } systemUser)
        {
            activity.SetTag(
                "maskinporten.systemuser_org",
                systemUser.Organization.Get(OrganizationNumberFormat.International)
            );

            if (systemUser.ExternalRef is { } externalRef)
                activity.SetTag("maskinporten.systemuser_external_ref", externalRef);
        }
    }

    internal void RecordMaskinportenTokenRequest(RequestResult result)
    {
        _counters[MetricNameTokenRequest]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
    }

    internal void RecordMaskinportenAltinnTokenExchangeRequest(RequestResult result)
    {
        _counters[MetricNameTokenExchangeRequest]
            .Add(1, new Tag(InternalLabels.Result, result.ToStringFast(useMetadataAttributes: true)));
    }

    internal static class Maskinporten
    {
        internal static readonly string MetricNameTokenRequest = Metrics.CreateLibName("maskinporten_token_requests");
        internal static readonly string MetricNameTokenExchangeRequest = Metrics.CreateLibName(
            "maskinporten_altinn_exchange_requests"
        );

        [EnumExtensions(MetadataSource = MetadataSource.DisplayAttribute)]
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
