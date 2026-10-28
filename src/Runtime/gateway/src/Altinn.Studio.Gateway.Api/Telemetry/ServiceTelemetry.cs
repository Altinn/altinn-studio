using System.Diagnostics;
using Altinn.Studio.Common.Telemetry;

namespace Altinn.Studio.Gateway.Api.Telemetry;

/// <summary>
/// The gateway's own telemetry names, under <c>altinn.gateway.</c>, next to the shared Altinn vocabulary in
/// <see cref="AltinnAttributes"/>.
/// </summary>
internal static class ServiceTelemetry
{
    /// <summary>
    /// The name of the gateway's activity source and meter.
    /// </summary>
    public const string Name = "gateway";

    public static readonly ActivitySource Source = new(Name);

    internal static class Attributes
    {
        public const string ErrorType = "error.type";

        /// <summary>
        /// The Studio environment a request or deploy belongs to: <c>dev</c>, <c>staging</c> or <c>prod</c>. Several
        /// Studio environments deploy to the same runtime cluster.
        /// </summary>
        public const string OriginEnvironment = "altinn.gateway.origin_environment";

        /// <summary>
        /// The reason of a Flux event, such as <c>UpgradeSucceeded</c>.
        /// </summary>
        public const string FluxReason = "altinn.gateway.flux.reason";

        /// <summary>
        /// Whether a reconcile request is for an undeploy.
        /// </summary>
        public const string ReconcileUndeploy = "altinn.gateway.reconcile.undeploy";

        /// <summary>
        /// The rule an alert from Grafana is for, such as <c>failed_process_next_requests</c>.
        /// </summary>
        public const string AlertRuleId = "altinn.gateway.alert.rule_id";

        /// <summary>
        /// The kind of Azure Monitor query, from a fixed set such as <c>metrics</c> or <c>activity_signals</c>.
        /// </summary>
        public const string AzureMonitorQuery = "altinn.gateway.azure_monitor.query";
    }

    /// <summary>
    /// Values of <c>error.type</c> the gateway chooses itself, where no exception or status code names the failure.
    /// </summary>
    internal static class ErrorTypes
    {
        /// <summary>
        /// A Flux event whose HelmRelease names no app the gateway can report on.
        /// </summary>
        public const string HelmReleaseUnresolved = "helm_release_unresolved";
    }

    public static void SetApp(this Activity? activity, string app) =>
        activity?.SetTag(AltinnAttributes.App, app.ToLowerInvariant());

    public static void SetOriginEnvironment(this Activity? activity, string originEnvironment) =>
        activity?.SetTag(Attributes.OriginEnvironment, originEnvironment.ToLowerInvariant());

    /// <summary>
    /// Marks the span as failed, with <c>error.type</c> naming the failure. The exception itself goes in an Error log.
    /// </summary>
    public static void SetError(this Activity? activity, string errorType)
    {
        activity?.SetStatus(ActivityStatusCode.Error);
        activity?.SetTag(Attributes.ErrorType, errorType);
    }

    public static void SetErrorIfAny(this Activity? activity, string? errorType)
    {
        if (errorType is not null)
        {
            activity.SetError(errorType);
        }
    }

    /// <summary>
    /// The <c>error.type</c> of an exception: the status code of an unsuccessful HTTP response, as the semantic
    /// conventions have it, and otherwise the exception's full type name.
    /// </summary>
    public static string ErrorTypeOf(Exception exception) =>
        exception is HttpRequestException { StatusCode: { } statusCode }
            ? ((int)statusCode).ToString(System.Globalization.CultureInfo.InvariantCulture)
            : exception.GetType().FullName ?? exception.GetType().Name;
}
