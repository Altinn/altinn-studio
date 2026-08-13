namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the eFormidling client changes the namespace rewrite cannot carry. The
/// namespaces that simply moved are rewritten automatically; everything reported here needs a human.
/// </summary>
/// <remarks>
/// Four concerns, reported separately because the guidance differs:
/// <list type="number">
/// <item>
/// <c>Altinn.EFormidlingClient.Extensions</c> - the <c>HttpClientExtension</c> header-dictionary
/// overloads. Deleted rather than moved: the name collides with the existing
/// <c>Altinn.App.Core.Extensions.HttpClientExtension</c>, and the eFormidling client no longer takes
/// caller-supplied headers. Apps are observed to use it for unrelated HTTP clients, which is exactly
/// why it is worth naming rather than silently dropping.
/// </item>
/// <item>The eight <c>IEFormidlingClient</c> endpoints removed with the move, and their models.</item>
/// <item><c>Content</c>, <c>Sort</c> and <c>Pageable</c>, now nested inside <c>Statuses</c>.</item>
/// <item>
/// The arkivmelding properties that became lists to match the Noark 5 schema's <c>unbounded</c>
/// cardinality.
/// </item>
/// </list>
/// The last two are scoped to files referencing the models namespace, since their names are far too
/// ordinary to match safely across a whole app.
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

    /// <summary>
    /// Types that still exist but are now nested inside <c>Statuses</c>. Their old names were too
    /// generic to sit in a shared namespace; <c>Statuses</c> itself is unchanged.
    /// </summary>
    private static readonly IReadOnlySet<string> _nestedModels = new HashSet<string>(StringComparer.Ordinal)
    {
        "Content",
        "Sort",
        "Pageable",
    };

    /// <summary>
    /// The models namespace, before and after the move. Matching these nested names anywhere would be
    /// far too broad — <c>Content</c> in particular is an everyday identifier — so they are only
    /// reported in files that reference the namespace they came from. The new name is checked first
    /// because the namespace rewrite has already run by the time detection happens.
    /// </summary>
    private static readonly string[] _modelNamespaces =
    [
        "Altinn.App.Core.EFormidling.Models",
        "Altinn.Common.EFormidlingClient.Models",
    ];

    private const string ExtensionsSummary =
        "Altinn.EFormidlingClient.Extensions is removed in v9 and has no replacement namespace. It held "
        + "HttpClientExtension - the GetAsync/PostAsync/PutAsync/DeleteAsync overloads taking a "
        + "Dictionary<string, string> of request headers - which is gone because the eFormidling client now "
        + "resolves its own authentication. Note that Altinn.App.Core.Extensions.HttpClientExtension is a "
        + "different type with different overloads and is not a drop-in substitute. If the app used these "
        + "overloads for its own HTTP calls (unrelated to eFormidling), build the HttpRequestMessage directly "
        + "and add the headers to it, then call HttpClient.SendAsync. Update these files by hand:";

    /// <summary>
    /// Noark types whose child collections became repeatable. Reported on the same
    /// namespace-scoped basis as the nested models.
    /// </summary>
    private static readonly IReadOnlySet<string> _repeatableOwners = new HashSet<string>(StringComparer.Ordinal)
    {
        "Basisregistrering",
        "Dokumentbeskrivelse",
    };

    /// <summary>
    /// The SBD envelope namespace, before and after the move.
    /// </summary>
    private static readonly string[] _sbdNamespaces =
    [
        "Altinn.App.Core.EFormidling.Models.SBD",
        "Altinn.Common.EFormidlingClient.Models.SBD",
    ];

    /// <summary>
    /// Identifies use of the SBD's renamed <c>Arkivmelding</c> by pairing the constructed type with a
    /// member only it has. The type name alone cannot be matched, because the Noark 5
    /// <c>Arkivmelding</c> keeps that name and flagging it would report nearly every eFormidling app;
    /// the Noark type has neither of these members, so the pairing separates them without a semantic
    /// model.
    /// </summary>
    private static readonly IReadOnlySet<string> _sbdArkivmeldingTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "Arkivmelding",
    };

    private static readonly IReadOnlySet<string> _sbdArkivmeldingMembers = new HashSet<string>(StringComparer.Ordinal)
    {
        "Sikkerhetsnivaa",
        "DPF",
    };

    private static readonly IReadOnlySet<string> _sbdRenamedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "DPF",
    };

    private const string SbdSummary =
        "The Standard Business Document's Arkivmelding is now ArkivmeldingMetadata, and the DPF type it "
        + "refers to is now Dpf. The old name collided with the Noark 5 "
        + "Arkivmelding - a different type in a sibling namespace - which forced anyone handling both to "
        + "alias one of them; the Noark type is unchanged. The JSON is unchanged too: the property is still "
        + "called Arkivmelding and still serializes to \"arkivmelding\". Only code that builds the SBD "
        + "envelope by hand is affected, which is not something the built-in shipment requires:";

    private const string RepeatableSummary =
        "Two arkivmelding properties are now lists, matching the Noark 5 schema, which has always "
        + "declared both as maxOccurs=\"unbounded\": Basisregistrering.Dokumentbeskrivelse is a "
        + "List<Dokumentbeskrivelse> and Dokumentbeskrivelse.Dokumentobjekt is a List<Dokumentobjekt>. "
        + "Until now a journalpost could only describe a single document, so a main document plus "
        + "attachments could not be expressed at all. Wrap the existing initialisers in a collection; "
        + "Basisregistrering also gained an optional Dokumentobjekt list for objects attached directly "
        + "to the registration. Apps that carry their own copy of these models are unaffected:";

    private const string NestedSummary =
        "These eFormidling status models are now nested inside the Statuses class they describe, because "
        + "their old names were too generic to sit in a shared namespace: Content is Statuses.Entry, Sort is "
        + "Statuses.SortInfo, and Pageable is Statuses.PageInfo. Statuses itself is unchanged, and so is the "
        + "JSON on the wire. Qualify these usages:";

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

    private static bool ReferencesModelsNamespace(ScannedCSharpFile file) =>
        Array.Exists(_modelNamespaces, ns => CSharpSyntaxQueries.UsingNamespaces(file, ns).Any());

    private static bool ReferencesSbdNamespace(ScannedCSharpFile file) =>
        Array.Exists(_sbdNamespaces, ns => CSharpSyntaxQueries.UsingNamespaces(file, ns).Any());

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

        ScannedCSharpFile[] modelFiles = _scanner.Files.Where(ReferencesModelsNamespace).ToArray();

        var nested = modelFiles.SelectMany(file => CSharpSyntaxQueries.TypeReferences(file, _nestedModels));
        var repeatable = modelFiles.SelectMany(file => CSharpSyntaxQueries.TypeReferences(file, _repeatableOwners));

        var sbd = _scanner
            .Files.Where(ReferencesSbdNamespace)
            .SelectMany(file =>
                CSharpSyntaxQueries
                    .TypeReferences(file, _sbdRenamedTypes)
                    .Concat(
                        CSharpSyntaxQueries.ObjectInitializerMembers(
                            file,
                            _sbdArkivmeldingTypes,
                            _sbdArkivmeldingMembers
                        )
                    )
            );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(ExtensionsSummary, extensions),
            WarnOnlyDetector.Report(EndpointsSummary, endpoints),
            WarnOnlyDetector.Report(NestedSummary, nested),
            WarnOnlyDetector.Report(RepeatableSummary, repeatable),
            WarnOnlyDetector.Report(SbdSummary, sbd)
        );
    }
}
