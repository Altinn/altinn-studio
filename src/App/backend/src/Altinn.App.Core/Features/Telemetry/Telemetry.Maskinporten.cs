using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
using NetEscapades.EnumGenerators;
using static Altinn.App.Core.Features.Telemetry.Maskinporten;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitMaskinporten(InitContext context)
    {
        InitMetricCounter(
            context,
            MetricNameTokenRequest,
            "{request}",
            "Maskinporten tokens the app asked for, from its cache or from Maskinporten."
        );
        InitMetricCounter(
            context,
            MetricNameTokenExchangeRequest,
            "{request}",
            "Maskinporten tokens the app asked to exchange for Altinn tokens, from its cache or from Altinn."
        );
    }

    internal Activity? StartGetAccessTokenActivity(string clientId, MaskinportenTokenRequest request)
    {
        var activity = LibraryActivitySource.StartActivity("Maskinporten.GetAccessToken");
        SetRequestTags(activity, clientId, request);
        return activity;
    }

    internal Activity? StartGetAltinnExchangedAccessTokenActivity(string clientId, MaskinportenTokenRequest request)
    {
        var activity = LibraryActivitySource.StartActivity("Maskinporten.GetAltinnExchangedAccessToken");
        SetRequestTags(activity, clientId, request);
        return activity;
    }

    private static TagList TokenOutcome(RequestResult result) =>
        result == RequestResult.Error
            ? Outcome(failed: true)
            : new TagList { { InternalLabels.MaskinportenTokenCached, result == RequestResult.Cached } };

    private static void SetRequestTags(Activity? activity, string clientId, MaskinportenTokenRequest request)
    {
        if (activity is null)
            return;

        activity.SetTag("altinn.maskinporten.scopes", request.FormattedScopes);
        activity.SetTag("altinn.maskinporten.client_id", clientId);

        if (request.ConsumerOrg is { } consumerOrg)
            activity.SetTag("altinn.maskinporten.consumer_org", consumerOrg.Get(OrganizationNumberFormat.Local));

        if (request.Resource is { } resource)
            activity.SetTag("altinn.maskinporten.resource", resource);

        if (request.SystemUser is { } systemUser)
        {
            activity.SetTag(
                "altinn.maskinporten.system_user_org",
                systemUser.Organization.Get(OrganizationNumberFormat.International)
            );

            if (systemUser.ExternalRef is { } externalRef)
                activity.SetTag("altinn.maskinporten.system_user_external_ref", externalRef);
        }
    }

    internal void RecordMaskinportenTokenRequest(RequestResult result)
    {
        _counters[MetricNameTokenRequest].Add(1, TokenOutcome(result));
    }

    internal void RecordMaskinportenAltinnTokenExchangeRequest(RequestResult result)
    {
        _counters[MetricNameTokenExchangeRequest].Add(1, TokenOutcome(result));
    }

    internal static class Maskinporten
    {
        internal static readonly string MetricNameTokenRequest = Metrics.CreateLibName("maskinporten.token_requests");
        internal static readonly string MetricNameTokenExchangeRequest = Metrics.CreateLibName(
            "maskinporten.altinn_token_exchanges"
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
