using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// <para>The Maskinporten scopes an app appears to need, gathered from everything the upgrade can see and
/// reported as one list with the evidence for each. It exists because a v9 app has two Maskinporten clients
/// rather than one - the client Studio provisions for the deployed app, and the client the developer stores
/// with <c>studioctl app maskinporten set</c> for local runs - and the same scopes have to be granted on
/// both, separately. One list answers both questions.</para>
/// <para>The list is deliberately not exhaustive, and says so: a scope passed as a variable, a constant or a
/// configuration read is invisible to a syntax-only scan, and a direct
/// <c>IMaskinportenClient.GetAccessToken(..)</c> call is not harvested at all because <c>GetAccessToken</c>
/// is too generic a name to match without a semantic model. Reporting a short honest list beats implying a
/// complete one.</para>
/// <para><c>altinn:serviceowner</c> and its <c>instances.read</c>/<c>instances.write</c> children are
/// deliberately never reported. Studio adds them to the provisioned client automatically when a v9 app is
/// built, and a local run does not need them, so listing them would be three rows of noise on every app to
/// serve the rare case of an app minting an organization token against a real environment.</para>
/// </summary>
internal sealed class MaskinportenScopeInventory
{
    /// <summary>
    /// The scope Fiks requires. It is fixed in practice: <c>KS.Fiks.IO.Send.Client</c> and the Fiks
    /// Maskinporten client document it as the scope for every Fiks integration, and it appears nowhere in
    /// this repository because the app libraries forward whatever scopes they are handed.
    /// </summary>
    private const string FiksScope = "ks:fiks";

    /// <summary>
    /// The scope the correspondence client requires, from <c>ICorrespondenceClient</c>'s own contract. That
    /// contract also names <c>altinn:serviceowner</c>, which is deliberately not reported here.
    /// </summary>
    private const string CorrespondenceScope = "altinn:correspondence.write";

    /// <summary>
    /// Registration and client names that say an app uses Fiks. Either the setup call or a
    /// <c>fiksArkiv</c> service task in the process is enough.
    /// </summary>
    private static readonly IReadOnlySet<string> _fiksMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "AddFiksArkiv",
        "AddFiksIOClient",
    };

    private static readonly IReadOnlySet<string> _correspondenceTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "ICorrespondenceClient",
    };

    /// <summary>
    /// The scope-taking authorization helpers. Only these two names are matched: both are unambiguously
    /// Maskinporten's, so every string literal handed to one is a scope.
    /// </summary>
    private static readonly IReadOnlySet<string> _scopeMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "UseMaskinportenAuthorization",
        "UseMaskinportenAltinnAuthorization",
    };

    private static readonly IReadOnlySet<string> _tokenRequestTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "MaskinportenTokenRequest",
    };

    private static readonly XNamespace _bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    private const string Summary =
        "Maskinporten scopes this app appears to need. A v9 app has two Maskinporten clients, and the same "
        + "scopes must be granted on both, separately: the client Studio provisions for the deployed app, and "
        + "the client you store with studioctl app maskinporten set for local runs. For the deployed app, "
        + "select these in Studio under App settings, \"Velg scopes fra Maskinporten\" - that needs an "
        + "Ansattporten sign-in on behalf of the organization that owns the app, and takes effect the next "
        + "time the app is built and deployed, so do it before you deploy. For local runs, the client you "
        + "store must already have them in Maskinporten. Scopes found:";

    private const string Unreadable =
        "This app requests Maskinporten tokens, but none of the scopes it asks for are written as literals - "
        + "they come from variables, constants or configuration - so the upgrade cannot list them. Work them "
        + "out from the call sites yourself. They are still needed on both of the app's Maskinporten clients: "
        + "select them in Studio under App settings, \"Velg scopes fra Maskinporten\", for the deployed app, "
        + "and make sure the client you store with studioctl app maskinporten set has them for local runs.";

    private const string Incomplete =
        "This list covers the scopes named as literals in your code, configuration and process. A scope "
        + "passed as a variable or read from configuration, or one requested through a direct "
        + "IMaskinportenClient.GetAccessToken(..) call, is not listed - check those call sites yourself. The "
        + "altinn:serviceowner scopes are not listed either: Studio adds them to the provisioned client "
        + "automatically when a v9 app is built.";

    private readonly CSharpSourceScanner _scanner;
    private readonly string _projectFolder;
    private readonly IReadOnlyList<(string Scope, string Evidence)> _configuredScopes;

    /// <param name="scanner">The app's scanned C# sources.</param>
    /// <param name="projectFolder">The app repository root, for the process definition.</param>
    /// <param name="configuredScopes">
    /// Scopes found in the app's settings files, from
    /// <see cref="MaskinportenSettingsSectionDetector.ConfiguredScopes"/> - the sections the upgrade is about
    /// to tell the developer to delete, which is the one authoritative record of what the v8 client asked for.
    /// </param>
    public MaskinportenScopeInventory(
        CSharpSourceScanner scanner,
        string projectFolder,
        IReadOnlyList<(string Scope, string Evidence)>? configuredScopes = null
    )
    {
        _scanner = scanner;
        _projectFolder = projectFolder;
        _configuredScopes = configuredScopes ?? [];
    }

    public MigrationResult Describe()
    {
        var found = new SortedDictionary<string, SortedSet<string>>(StringComparer.Ordinal);
        var requestsTokens = false;

        void Add(string scope, string evidence)
        {
            var trimmed = scope.Trim();
            if (trimmed.Length == 0 || IsServiceOwnerScope(trimmed))
            {
                return;
            }

            if (!found.TryGetValue(trimmed, out var evidences))
            {
                evidences = new SortedSet<string>(StringComparer.Ordinal);
                found[trimmed] = evidences;
            }
            evidences.Add(evidence);
        }

        foreach (var file in _scanner.Files)
        {
            // Tracked separately from the scopes harvested below: a call whose scopes are a variable or a
            // configuration read contributes no rows, and silence there would read as "this app needs no
            // scopes" when the truth is "this tool cannot see which".
            requestsTokens =
                requestsTokens
                || CSharpSyntaxQueries.InvokedMethods(file, _scopeMethods).Any()
                || CSharpSyntaxQueries.TypeReferences(file, _tokenRequestTypes).Any();

            foreach (var (match, value) in CSharpSyntaxQueries.StringArgumentsOf(file, _scopeMethods))
            {
                Add(value, $"{match.Symbol} at {match.Location}");
            }

            foreach (
                var (match, value) in CSharpSyntaxQueries.InitializerStringValues(file, _tokenRequestTypes, "Scopes")
            )
            {
                Add(value, $"{match.Symbol} at {match.Location}");
            }

            foreach (var match in CSharpSyntaxQueries.InvokedMethods(file, _fiksMethods))
            {
                Add(FiksScope, $"Fiks: {match.Symbol} at {match.Location}");
            }

            foreach (var match in CSharpSyntaxQueries.TypeReferences(file, _correspondenceTypes))
            {
                Add(CorrespondenceScope, $"correspondence: {match.Symbol} at {match.Location}");
            }
        }

        if (HasFiksServiceTask())
        {
            Add(FiksScope, "Fiks: a fiksArkiv service task in config/process/process.bpmn");
        }

        foreach (var (scope, evidence) in _configuredScopes)
        {
            Add(scope, evidence);
        }

        if (found.Count == 0)
        {
            // An app that asks for tokens but names no scope literal is the case this report must not stay
            // quiet about: it needs grants on both clients and the upgrade cannot say which.
            return requestsTokens
                ? new MigrationResult([new UpgradeMessage(Unreadable, UpgradeMessageStatus.Todo)])
                : new MigrationResult();
        }

        var messages = new List<UpgradeMessage>();
        messages.Warn(Summary);
        messages.WarnRange(found.Select(static entry => $"{entry.Key} - {string.Join("; ", entry.Value)}"));
        messages.Warn(Incomplete);
        return new MigrationResult(messages);
    }

    /// <summary>
    /// Whether the app's process defines a <c>fiksArkiv</c> service task. An unreadable or absent process
    /// is simply no evidence: the C# registration is the other way in, and a malformed-XML complaint from a
    /// scope report would be a confusing way to learn the process file is broken.
    /// </summary>
    private bool HasFiksServiceTask()
    {
        var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
        if (processFile is null)
        {
            return false;
        }

        XDocument document;
        try
        {
            document = XDocument.Load(processFile);
        }
        catch (Exception exception)
            when (exception is System.Xml.XmlException or IOException or UnauthorizedAccessException)
        {
            return false;
        }

        return document
            .Descendants(_bpmnNs + "serviceTask")
            .Any(task =>
                task.Descendants(_altinnNs + "taskType")
                    .Any(type => string.Equals(type.Value.Trim(), "fiksArkiv", StringComparison.Ordinal))
            );
    }

    /// <summary>
    /// Whether a scope is <c>altinn:serviceowner</c> or one of its children, which are never reported.
    /// Matched on the segment boundary so that a differently-named scope merely starting with the same
    /// letters is still reported.
    /// </summary>
    private static bool IsServiceOwnerScope(string scope) =>
        string.Equals(scope, "altinn:serviceowner", StringComparison.OrdinalIgnoreCase)
        || scope.StartsWith("altinn:serviceowner/", StringComparison.OrdinalIgnoreCase);
}
