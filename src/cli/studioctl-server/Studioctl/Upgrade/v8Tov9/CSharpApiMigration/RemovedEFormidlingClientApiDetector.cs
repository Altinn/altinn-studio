namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the eFormidling client changes the namespace rewrite cannot carry. The
/// namespaces that simply moved are rewritten automatically; everything reported here needs a human.
/// </summary>
/// <remarks>
/// Five concerns, reported separately because the guidance differs:
/// <list type="number">
/// <item><c>Altinn.EFormidlingClient.Extensions</c> - the <c>HttpClientExtension</c> header-dictionary
/// overloads, deleted with no destination to rewrite to. Apps are observed to use it for unrelated
/// HTTP clients, which is why it is worth naming rather than silently dropping.</item>
/// <item>The eight <c>IEFormidlingClient</c> endpoints removed with the move, and their models.</item>
/// <item><c>Content</c>, <c>Sort</c> and <c>Pageable</c>, now nested inside <c>Statuses</c>.</item>
/// <item>The arkivmelding properties that became lists to match the schema's <c>unbounded</c>
/// cardinality.</item>
/// <item>The SBD's <c>Arkivmelding</c>, renamed to <c>ArkivmeldingMetadata</c>.</item>
/// <item>Aliased <c>using</c> directives and fully-qualified references, which the rewrite skips.</item>
/// </list>
/// Concerns 3 to 5 are scoped to files referencing the namespace they came from, since their names are
/// far too ordinary to match safely across a whole app.
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
    /// Types that still exist but are now nested inside <c>Statuses</c>, which is itself unchanged.
    /// </summary>
    private static readonly IReadOnlySet<string> _nestedModels = new HashSet<string>(StringComparer.Ordinal)
    {
        "Content",
        "Sort",
        "Pageable",
    };

    /// <summary>
    /// The models namespace, before and after the move. <c>Content</c> in particular is an everyday
    /// identifier, so these names are only reported in files that reference the namespace they came
    /// from. The new name is checked first because the namespace rewrite has already run by then.
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
        + "resolves its own authentication. Altinn.App.Core.Extensions.HttpClientExtension is a different "
        + "type with different overloads, not a drop-in substitute. If the app used these overloads for its "
        + "own HTTP calls, build the HttpRequestMessage directly, add the headers to it, and call "
        + "HttpClient.SendAsync. Update these files by hand:";

    /// <summary>
    /// Noark types whose child collections became repeatable. Reported on the same
    /// namespace-scoped basis as the nested models.
    /// </summary>
    private static readonly IReadOnlySet<string> _repeatableOwners = new HashSet<string>(StringComparer.Ordinal)
    {
        "Mappe",
        "Basisregistrering",
        "Dokumentbeskrivelse",
    };

    /// <summary>
    /// Namespaces the rewrite handles for plain <c>using</c> directives only. An aliased directive or a
    /// fully-qualified reference survives it untouched, so both are reported instead.
    /// </summary>
    private static readonly string[] _clientNamespaces =
    [
        "Altinn.Common.EFormidlingClient",
        "Altinn.EFormidlingClient",
    ];

    /// <summary>
    /// The SBD envelope namespace, before and after the move.
    /// </summary>
    private static readonly string[] _sbdNamespaces =
    [
        "Altinn.App.Core.EFormidling.Models.SBD",
        "Altinn.Common.EFormidlingClient.Models.SBD",
    ];

    /// <summary>
    /// Identifies the SBD's renamed <c>Arkivmelding</c> by pairing the constructed type with a member
    /// only it has. The name alone cannot be matched: the Noark 5 <c>Arkivmelding</c> keeps it, so
    /// that would report nearly every eFormidling app. The Noark type has neither of these members.
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
        + "refers to is now Dpf. The old name collided with the Noark 5 Arkivmelding in a sibling "
        + "namespace, which is unchanged. The JSON is unchanged too: the property is still called "
        + "Arkivmelding and still serializes to \"arkivmelding\". Rename these usages:";

    private const string RepeatableSummary =
        "Four arkivmelding properties are now lists, matching the Noark 5 schema, which has always "
        + "declared them as maxOccurs=\"unbounded\": Mappe.Basisregistrering, "
        + "Basisregistrering.Dokumentbeskrivelse, Basisregistrering.Korrespondansepart and "
        + "Dokumentbeskrivelse.Dokumentobjekt. Wrap the existing initialisers in a collection; "
        + "Basisregistrering also gained an optional Dokumentobjekt list for objects attached directly "
        + "to the registration. The elements of these types are now also emitted in the schema's "
        + "sequence rather than sorted by name, which needs nothing from you unless your app reads the "
        + "generated XML back. Apps that carry their own copy of these models are unaffected:";

    private const string QualifiedSummary =
        "These eFormidling client references survive the v9 namespace rewrite untouched, because it "
        + "only rewrites a plain 'using Altinn.Common.EFormidlingClient;'. An aliased directive "
        + "(using X = Altinn.Common.EFormidlingClient;), one written with global::, and a name written "
        + "out in full (Altinn.Common.EFormidlingClient.IEFormidlingClient) all have to be repointed by "
        + "hand. The namespaces moved to Altinn.App.Core.EFormidling - Interface for the client itself, "
        + "and Configuration, Models and Models.SBD for the rest:";

    private const string NestedSummary =
        "These eFormidling status models are now nested inside the Statuses class they describe: Content "
        + "is Statuses.Entry, Sort is Statuses.SortInfo, and Pageable is Statuses.PageInfo. Statuses "
        + "itself is unchanged, and so is the JSON on the wire. Qualify these usages:";

    private const string EndpointsSummary =
        "These IEFormidlingClient members are removed in v9. The client keeps only what a shipment is made "
        + "of: CreateMessage, UploadAttachment, SendMessage and GetMessageStatusById. Call the "
        + "integrasjonspunkt's REST API directly if the app still needs the capability, conversation or "
        + "subscription endpoints:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedEFormidlingClientApiDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    /// <summary>
    /// Whether a file reaches into <paramref name="namespaces"/> at all, by importing one or by writing
    /// a name in full. Both count: a file that only ever writes
    /// <c>Altinn.Common.EFormidlingClient.Models.Content</c> has no matching <c>using</c>, and scoping
    /// on imports alone would deny it the guidance it most needs.
    /// </summary>
    private static bool References(ScannedCSharpFile file, string[] namespaces) =>
        Array.Exists(
            namespaces,
            ns =>
                CSharpSyntaxQueries.UsingNamespaces(file, ns).Any()
                || CSharpSyntaxQueries.QualifiedNameReferences(file, ns).Any()
        );

    private static bool ReferencesModelsNamespace(ScannedCSharpFile file) => References(file, _modelNamespaces);

    private static bool ReferencesSbdNamespace(ScannedCSharpFile file) => References(file, _sbdNamespaces);

    public MigrationResult Detect()
    {
        var extensions = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .UsingNamespaces(file, ExtensionsNamespace)
                .Concat(CSharpSyntaxQueries.QualifiedNameReferences(file, ExtensionsNamespace))
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

        // Anything already reported under ExtensionsSummary is dropped here: the extensions namespace
        // sits under one of these prefixes, and its own summary carries the replacement to write, which
        // this generic one does not.
        var qualified = _scanner
            .Files.SelectMany(file =>
                _clientNamespaces.SelectMany(ns =>
                    CSharpSyntaxQueries
                        .UnrewritableUsingNamespaces(file, ns)
                        .Concat(CSharpSyntaxQueries.QualifiedNameReferences(file, ns))
                )
            )
            .Where(match => !match.Symbol.Contains(ExtensionsNamespace, StringComparison.Ordinal));

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(ExtensionsSummary, extensions),
            WarnOnlyDetector.Report(EndpointsSummary, endpoints),
            WarnOnlyDetector.Report(NestedSummary, nested),
            WarnOnlyDetector.Report(RepeatableSummary, repeatable),
            WarnOnlyDetector.Report(SbdSummary, sbd),
            WarnOnlyDetector.Report(QualifiedSummary, qualified)
        );
    }
}
