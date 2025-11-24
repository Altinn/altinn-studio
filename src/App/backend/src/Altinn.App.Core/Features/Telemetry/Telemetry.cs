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
        public static readonly string InstanceOwnerPartyId = "instance.owner.party.id";

        /// <summary>
        /// Label for the guid that identifies the instance.
        /// </summary>
        public static readonly string InstanceGuid = "instance.guid";

        /// <summary>
        /// Label for the guid that identifies the instance.
        /// </summary>
        public static readonly string InstanceEventsCount = "instance.events.count";

        /// <summary>
        /// Label for the guid that identifies the data.
        /// </summary>
        public static readonly string DataGuid = "data.guid";

        /// <summary>
        /// Label for the type of the data.
        /// </summary>
        public static readonly string DataType = "data.type";

        /// <summary>
        /// Label for the ID of the task.
        /// </summary>
        public static readonly string TaskId = "task.id";

        /// <summary>
        /// Label for the name of the user.
        /// </summary>
        public const string UserName = "user.name";

        /// <summary>
        /// Label for the ID of the user.
        /// </summary>
        public const string UserId = "user.id";

        /// <summary>
        /// Label for the ID of the party.
        /// </summary>
        public const string UserPartyId = "user.party.id";

        /// <summary>
        /// Label for the authentication method of the user.
        /// </summary>
        public const string UserAuthenticationMethod = "user.authentication.method";

        /// <summary>
        /// Label for the authentication level of the user.
        /// </summary>
        public const string UserAuthenticationLevel = "user.authentication.level";

        /// <summary>
        /// Label for the authentication type for the current client.
        /// </summary>
        public const string UserAuthenticationType = "user.authentication.type";

        /// <summary>
        /// Label for the authentication token issuer.
        /// </summary>
        public const string UserAuthenticationTokenIssuer = "user.authentication.token.issuer";

        /// <summary>
        /// Label for the authentication token isExchanged flag.
        /// </summary>
        public const string UserAuthenticationTokenIsExchanged = "user.authentication.token.isExchanged";

        /// <summary>
        /// Label for the authentication token clientId claim.
        /// </summary>
        public const string UserAuthenticationTokenClientId = "user.authentication.token.clientId";

        /// <summary>
        /// Label for the authentication token is issued from Altinn portal.
        /// </summary>
        public const string UserAuthenticationInAltinnPortal = "user.authentication.inAltinnPortal";

        /// <summary>
        /// Label for the organisation name.
        /// </summary>
        public const string OrganisationName = "organisation.name";

        /// <summary>
        /// Label for the organisation number.
        /// </summary>
        public const string OrganisationNumber = "organisation.number";

        /// <summary>
        /// Label for the ID of the system user.
        /// </summary>
        public const string OrganisationSystemUserId = "organisation.systemuser.id";

        /// <summary>
        /// Label for the Correspondence ID.
        /// </summary>
        public const string CorrespondenceId = "correspondence.id";

        /// <summary>
        /// Label for the Fiks Message ID.
        /// </summary>
        public const string FiksMessageId = "fiks.message.id";

        /// <summary>
        /// Label for the Fiks Message type.
        /// </summary>
        public const string FiksMessageType = "fiks.message.type";

        /// <summary>
        /// Label for the Fiks Message sender account.
        /// </summary>
        public const string FiksMessageSender = "fiks.message.sender";

        /// <summary>
        /// Label for the Fiks Message recipient account.
        /// </summary>
        public const string FiksMessageRecipient = "fiks.message.recipient";

        /// <summary>
        /// Label for the Fiks Message this was sent in reply to.
        /// </summary>
        public const string FiksInReplyToMessage = "fiks.message.inReplyTo";

        /// <summary>
        /// Label for the Fiks Message senders internal reference.
        /// </summary>
        public const string FiksSendersReference = "fiks.message.sendersReference";

        /// <summary>
        /// Label for the Fiks Message correlation id.
        /// </summary>
        public const string FiksMessageCorrelationId = "fiks.message.correlationId";
    }

    internal static class InternalLabels
    {
        internal const string Result = "result";
        internal const string Type = "type";
        internal const string AuthorizationAction = "authorization.action";
        internal const string AuthorizerAction = "authorization.authorizer.action";
        internal const string AuthorizerTaskId = "authorization.authorizer.task.id";
        internal const string ValidatorType = "validator.type";
        internal const string ValidatorSource = "validator.source";
        internal const string ValidatorRemoveHiddenData = "validator.remove_hidden_data";
        internal const string ValidatorHasRelevantChanges = "validator.has_relevant_changes";
        internal const string ValidatorChangedElementsIds = "validator.changed_elements_ids";
        internal const string ValidatorIssueCount = "validation.issue_count";
        internal const string ValidationTotalIssueCount = "validation.total_issue_count";

        internal const string ProcessErrorType = "process.error.type";
        internal const string ProcessAction = "process.action";
        internal const string ProcessServiceTaskType = "process.service.task.type";

        internal const string ProblemType = "problem.type";
        internal const string ProblemTitle = "problem.title";
        internal const string ProblemStatus = "problem.status";
        internal const string ProblemDetail = "problem.detail";
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
