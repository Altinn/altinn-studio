using System.Collections.Frozen;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features;

/// <summary>
/// Used for creating traces and metrics for the app.
/// </summary>
/// NOTE: this class holds all labels, metrics and trace datastructures for OTel based instrumentation.
/// There are a couple of reasons to do this
/// * Decouple metric lifetime from the objects that use them (since they are often scoped/transient)
/// * Create a logical boundary to emphasize that telemetry and label names are considered public contract, subject to semver same as the rest of the code
///   * Reason being that users may refer to these names in alerts, dashboards, saved queries etc
/// * Minimize cluttering of "business logic" with instrumentation code
///
/// Watch out for high cardinality when choosing tags. Most timeseries and tracing databases
/// do not handle high cardinality well.
public sealed partial class Telemetry : IDisposable
{
    internal bool IsDisposed;
    internal bool IsInitialized;
    private readonly object _lock = new();

    /// <summary>
    /// Gets the ActivitySource for the app.
    /// Using this, you can create traces that are transported to the OpenTelemetry collector.
    /// </summary>
    public ActivitySource ActivitySource { get; }

    /// <summary>
    /// Gets the Meter for the app.
    /// Using this, you can create metrics that are transported to the OpenTelemetry collector.
    /// </summary>
    public Meter Meter { get; }

    private FrozenDictionary<string, Counter<long>> _counters;
    private FrozenDictionary<string, Histogram<double>> _histograms;

    /// <summary>
    /// Initializes a new instance of the <see cref="Telemetry"/> class.
    /// </summary>
    /// <param name="appIdentifier"></param>
    /// <param name="appSettings"></param>
    public Telemetry(AppIdentifier appIdentifier, IOptions<AppSettings> appSettings)
    {
        var appId = appIdentifier.App;
        var appVersion = appSettings.Value.AppVersion;
        ActivitySource = new ActivitySource(appId, appVersion);
        Meter = new Meter(appId, appVersion);

        _counters = FrozenDictionary<string, Counter<long>>.Empty;
        _histograms = FrozenDictionary<string, Histogram<double>>.Empty;

        Init();
    }

    internal void Init()
    {
        lock (_lock)
        {
            if (IsInitialized)
                return;
            IsInitialized = true;

            var counters = new Dictionary<string, Counter<long>>();
            var histograms = new Dictionary<string, Histogram<double>>();
            var context = new InitContext(counters, histograms);

            InitData(context);
            InitInstances(context);
            InitNotifications(context);
            InitSigning(context);
            InitSigningDelegation(context);
            InitProcesses(context);
            InitValidation(context);
            InitMaskinporten(context);
            InitCorrespondence(context);
            InitFiks(context);

            // NOTE: This Telemetry class is registered as a singleton
            // Metrics could be kept in fields of the respective objects that use them for instrumentation
            // but most of these objects have scoped or transient lifetime, which would be inefficient.
            // So instead they are kept in frozen dicts here and looked up as they are incremented.
            // Another option would be to keep them as plain fields here
            _counters = counters.ToFrozenDictionary();
            _histograms = histograms.ToFrozenDictionary();
        }
    }

    private readonly record struct InitContext(
        Dictionary<string, Counter<long>> Counters,
        Dictionary<string, Histogram<double>> Histograms
    );

    /// <summary>
    /// Utility methods for creating metrics for an app.
    /// </summary>
    public static class Metrics
    {
        internal static readonly string Prefix = "altinn_app_lib";
        internal static readonly string PrefixCustom = "altinn_app";

        /// <summary>
        /// Creates a name for a metric with the prefix "altinn_app".
        /// </summary>
        /// <param name="name">Name of the metric, naming-convention is 'snake_case'</param>
        /// <returns>Full metric name</returns>
        public static string CreateName(string name) => $"{PrefixCustom}_{name}";

        internal static string CreateLibName(string name) => $"{Prefix}_{name}";
    }

    /// <summary>
    /// Labels used to tag traces for observability.
    /// </summary>
    public static class Labels
    {
        /// <summary>
        /// Label for the party ID of the instance owner.
        /// </summary>
        public static readonly string InstanceOwnerPartyId = "altinn.instance.owner.party.id";

        /// <summary>
        /// Label for the guid that identifies the instance.
        /// </summary>
        public static readonly string InstanceGuid = "altinn.instance.guid";

        /// <summary>
        /// Label for the guid that identifies the instance.
        /// </summary>
        public static readonly string InstanceEventsCount = "altinn.instance.events.count";

        /// <summary>
        /// Label for the guid that identifies the data.
        /// </summary>
        public static readonly string DataGuid = "altinn.data.guid";

        /// <summary>
        /// Label for the type of the data.
        /// </summary>
        public static readonly string DataType = "altinn.data.type";

        /// <summary>
        /// Label for the ID of the task.
        /// </summary>
        public static readonly string TaskId = "altinn.process.task.id";

        /// <summary>
        /// Label for the name of the user.
        /// </summary>
        public const string UserName = "altinn.user.name";

        /// <summary>
        /// Label for the ID of the user.
        /// </summary>
        public const string UserId = "enduser.id";

        /// <summary>
        /// Label for the ID of the party.
        /// </summary>
        public const string UserPartyId = "altinn.user.party.id";

        /// <summary>
        /// Label for the authentication method of the user.
        /// </summary>
        public const string UserAuthenticationMethod = "altinn.user.authentication.method";

        /// <summary>
        /// Label for the authentication level of the user.
        /// </summary>
        public const string UserAuthenticationLevel = "altinn.user.authentication.level";

        /// <summary>
        /// Label for the authentication type for the current client.
        /// </summary>
        public const string UserAuthenticationType = "altinn.user.authentication.type";

        /// <summary>
        /// Label for the authentication token issuer.
        /// </summary>
        public const string UserAuthenticationTokenIssuer = "altinn.user.authentication.token.issuer";

        /// <summary>
        /// Label for the authentication token isExchanged flag.
        /// </summary>
        public const string UserAuthenticationTokenIsExchanged = "altinn.user.authentication.token.is_exchanged";

        /// <summary>
        /// Label for the authentication token clientId claim.
        /// </summary>
        public const string UserAuthenticationTokenClientId = "altinn.user.authentication.token.client_id";

        /// <summary>
        /// Label for the authentication token is issued from Altinn portal.
        /// </summary>
        public const string UserAuthenticationInAltinnPortal = "altinn.user.authentication.in_altinn_portal";

        /// <summary>
        /// Label for the organization name.
        /// </summary>
        public const string OrganizationName = "altinn.organization.name";

        /// <summary>
        /// Label for the organization number.
        /// </summary>
        public const string OrganizationNumber = "altinn.organization.number";

        /// <summary>
        /// Label for the ID of the system user.
        /// </summary>
        public const string OrganizationSystemUserId = "enduser.id";

        /// <summary>
        /// Label for the Correspondence ID.
        /// </summary>
        public const string CorrespondenceId = "altinn.correspondence.id";

        /// <summary>
        /// Label for the Fiks Message ID.
        /// </summary>
        public const string FiksMessageId = "altinn.fiks.message.id";

        /// <summary>
        /// Label for the Fiks Message type.
        /// </summary>
        public const string FiksMessageType = "altinn.fiks.message.type";

        /// <summary>
        /// Label for the Fiks Message sender account.
        /// </summary>
        public const string FiksMessageSender = "altinn.fiks.message.sender";

        /// <summary>
        /// Label for the Fiks Message recipient account.
        /// </summary>
        public const string FiksMessageRecipient = "altinn.fiks.message.recipient";

        /// <summary>
        /// Label for the Fiks Message this was sent in reply to.
        /// </summary>
        public const string FiksInReplyToMessage = "altinn.fiks.message.in_reply_to";

        /// <summary>
        /// Label for the Fiks Message senders internal reference.
        /// </summary>
        public const string FiksSendersReference = "altinn.fiks.message.senders_reference";

        /// <summary>
        /// Label for the Fiks Message correlation id.
        /// </summary>
        public const string FiksMessageCorrelationId = "altinn.fiks.message.correlation_id";

        /// <summary>
        /// Marks telemetry that the collectors keep whatever their sampling, with the value <c>always</c>. Set it on
        /// a span with <see cref="TelemetryActivityExtensions.KeepTrace"/>.
        /// </summary>
        public const string Sampling = "altinn.sampling";

        /// <summary>
        /// Label for notification senders reference.
        /// </summary>
        public const string NotificationSendersReference = "altinn.notification.senders_reference";
    }

    internal static class InternalLabels
    {
        /// <summary>
        /// Resource attribute: the app's service owner, its <c>org</c>, such as <c>ttd</c>.
        /// </summary>
        internal const string ServiceOwner = "altinn.service_owner";

        /// <summary>
        /// Resource attribute: the app's name without the service owner.
        /// </summary>
        internal const string App = "altinn.app";

        /// <summary>
        /// Resource attribute: the version of the app libraries. Telemetry without it comes from v8.
        /// </summary>
        internal const string AppLibVersion = "altinn.app_lib.version";

        internal const string NotificationOrderId = "altinn.notification.order.id";
        internal const string NotificationType = "altinn.notification.type";

        // Metric attributes keep the names v8 has, as the metric names do: dashboards and the collectors' metric
        // allowlist read them for v8 and v9 apps alike. They are never span attributes.
        internal const string Result = "result";
        internal const string Type = "type";
        internal const string AuthorizationAction = "altinn.authorization.action";
        internal const string AuthorizerAction = "altinn.authorization.authorizer.action";
        internal const string AuthorizerTaskId = "altinn.authorization.authorizer.task.id";

        /// <summary>
        /// Set (to true, and otherwise absent) when a platform call was refused while the app acted
        /// as the service owner - which usually means the app's own policy is missing a service-owner
        /// grant rather than that anything transient happened. A policy gap looks like any other
        /// failed workflow in the engine's metrics, so this is the attribute that separates the two:
        /// it affects every instance of the app, and needs a policy change rather than a redrive.
        /// </summary>
        internal const string ServiceOwnerAuthorizationDenied = "altinn.authorization.service_owner.denied";
        internal const string ValidatorType = "altinn.validator.type";
        internal const string ValidatorSource = "altinn.validator.source";
        internal const string ValidatorRemoveHiddenData = "altinn.validator.remove_hidden_data";
        internal const string ValidatorHasRelevantChanges = "altinn.validator.has_relevant_changes";
        internal const string ValidatorChangedElementsIds = "altinn.validator.changed_elements_ids";
        internal const string ValidatorIssueCount = "altinn.validation.issue_count";
        internal const string ValidationTotalIssueCount = "altinn.validation.total_issue_count";

        internal const string ProcessErrorType = "altinn.process.error.type";
        internal const string ProcessAction = "altinn.process.action";
        internal const string ProcessServiceTaskType = "altinn.process.service_task.type";
        internal const string ProcessCallbackCommand = "altinn.process.callback.command";
        internal const string ProcessEventType = "altinn.process.event.type";
        internal const string ProcessCurrentElement = "altinn.process.current.element";

        internal const string ProblemType = "altinn.problem.type";
        internal const string ProblemTitle = "altinn.problem.title";
        internal const string ProblemStatus = "altinn.problem.status";
        internal const string ProblemDetail = "altinn.problem.detail";
    }

    private void InitMetricCounter(InitContext context, string name, Action<Counter<long>> init)
    {
        // NOTE: There is an initialization function here mostly to zero-init counters.
        // This is useful in a prometheus-setting due to the 'increase' operator being a bit strange:
        // * none -> 1 does not count as an increase
        // * 0 -> 1 does count as an increase
        var counter = Meter.CreateCounter<long>(name, unit: null, description: null);
        context.Counters.Add(name, counter);
        init(counter);
    }

    private void InitMetricHistogram(InitContext context, string name)
    {
        var histogram = Meter.CreateHistogram<double>(name, unit: null, description: null);
        context.Histograms.Add(name, histogram);
    }

    /// <summary>
    /// Disposes the Telemetry object.
    /// </summary>
    public void Dispose()
    {
        lock (_lock)
        {
            if (IsDisposed)
                return;

            IsDisposed = true;
            ActivitySource?.Dispose();
            Meter?.Dispose();
        }
    }
}
