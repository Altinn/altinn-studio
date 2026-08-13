namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the parts of <c>Altinn.Common.EFormidlingClient</c> that did not survive the
/// move into <c>Altinn.App.Core</c>. The namespaces that did move are rewritten automatically; this
/// reports only what has no destination to be rewritten to.
/// </summary>
/// <remarks>
/// Two distinct concerns, reported separately because the guidance differs:
/// <list type="number">
/// <item>
/// <c>Altinn.EFormidlingClient.Extensions</c> - the <c>HttpClientExtension</c> header-dictionary
/// overloads. Deleted rather than moved: the name collides with the existing
/// <c>Altinn.App.Core.Extensions.HttpClientExtension</c>, and the eFormidling client no longer takes
/// caller-supplied headers. Apps are observed to use it for unrelated HTTP clients, which is exactly
/// why it is worth naming rather than silently dropping.
/// </item>
/// <item>
/// The eight <c>IEFormidlingClient</c> endpoints removed with the move.
/// </item>
/// </list>
/// </remarks>
internal sealed class RemovedEFormidlingClientApiDetector
{
    private const string ExtensionsNamespace = "Altinn.EFormidlingClient.Extensions";

    private static readonly IReadOnlySet<string> _removedEndpoints = new HashSet<string>(StringComparer.Ordinal)
    {
        "GetCapabilities",
        "GetAllConversations",
        "GetConversationById",
        "GetConversationByMessageId",
        "GetAllMessageStatuses",
        "FindOutGoingMessages",
        "SubscribeeFormidling",
        "UnSubscribeeFormidling",
    };

    private static readonly IReadOnlySet<string> _removedModels = new HashSet<string>(StringComparer.Ordinal)
    {
        "Capabilities",
        "Capability",
        "Conversation",
        "CreateSubscription",
    };

    private const string ExtensionsSummary =
        "Altinn.EFormidlingClient.Extensions is removed in v9 and has no replacement namespace. It held "
        + "HttpClientExtension - the GetAsync/PostAsync/PutAsync/DeleteAsync overloads taking a "
        + "Dictionary<string, string> of request headers - which is gone because the eFormidling client now "
        + "resolves its own authentication. Note that Altinn.App.Core.Extensions.HttpClientExtension is a "
        + "different type with different overloads and is not a drop-in substitute. If the app used these "
        + "overloads for its own HTTP calls (unrelated to eFormidling), build the HttpRequestMessage directly "
        + "and add the headers to it, then call HttpClient.SendAsync. Update these files by hand:";

    private const string EndpointsSummary =
        "These IEFormidlingClient members are removed in v9. The client keeps only what a shipment is made "
        + "of - CreateMessage, UploadAttachment, SendMessage and GetMessageStatusById - and the capability, "
        + "conversation and subscription endpoints (and their models) went with the move into Altinn.App.Core. "
        + "Call the integrasjonspunkt's REST API directly if the app still needs them:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedEFormidlingClientApiDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var extensions = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries.UsingNamespaces(file, ExtensionsNamespace)
        );

        var endpoints = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .InvokedMethods(file, _removedEndpoints)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedModels))
        );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(ExtensionsSummary, extensions),
            WarnOnlyDetector.Report(EndpointsSummary, endpoints)
        );
    }
}
