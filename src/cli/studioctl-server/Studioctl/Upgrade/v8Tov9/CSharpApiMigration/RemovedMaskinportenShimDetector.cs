namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the obsolete Maskinporten surface that <c>Altinn.App.Core</c> used to expose
/// as a thin shim over the external <c>Altinn.ApiClients.Maskinporten</c> package: the
/// <c>IMaskinportenTokenProvider</c>/<c>MaskinportenJwkTokenProvider</c> pair, the
/// <c>AddMaskinportenJwkTokenProvider</c> registration, the <c>IX509CertificateProvider</c> abstraction,
/// and the <c>EformidlingStatusCheckEventHandler</c> that consumed them. All of these are gone in v9.
/// The Maskinporten types are replaced by the built-in <c>IMaskinportenClient</c>; the eFormidling handler
/// is not, so it is reported separately and pointed at <c>AddEFormidlingServices2</c>.
/// <para>
/// Unlike <see cref="ExternalMaskinportenPackageDetector"/>, no NuGet reference can bring these back -
/// they were app-lib types, not package types - so this is always a hard break requiring a port. The
/// port is not mechanical: the built-in client authenticates with a JWK only, so an app on a PKCS#12
/// certificate or a certificate-store thumbprint needs a new key registered in Maskinporten before it
/// can move over. Hence reporting rather than rewriting.
/// </para>
/// </summary>
internal sealed class RemovedMaskinportenShimDetector
{
    private static readonly IReadOnlySet<string> _removedMaskinportenTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IMaskinportenTokenProvider",
        "MaskinportenJwkTokenProvider",
        "IX509CertificateProvider",
    };

    // Only the registration extension is matched by name. The removed provider's own methods (`GetToken`,
    // `GetAltinnExchangedToken`) are deliberately not: `GetAltinnExchangedToken` is also a method on the
    // replacement IMaskinportenClient, so matching it would flag exactly the code apps are being told to
    // write. Call sites are reached via the interface reference instead.
    private static readonly IReadOnlySet<string> _removedMaskinportenMethods = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "AddMaskinportenJwkTokenProvider",
    };

    // The removed eFormidling status check handler. It fell with the Maskinporten shim because it consumed
    // it, but its replacement is an eFormidling one, so it is reported separately with its own guidance.
    // Matching is exact, so `EformidlingStatusCheckEventHandler2` - which survives in v9 as an internal type
    // registered by AddEFormidlingServices2 - is not caught here.
    private static readonly IReadOnlySet<string> _removedEformidlingTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "EformidlingStatusCheckEventHandler",
    };

    private const string MaskinportenSummary =
        "The obsolete Maskinporten types in Altinn.App.Core are removed in v9 "
        + "(IMaskinportenTokenProvider, MaskinportenJwkTokenProvider, AddMaskinportenJwkTokenProvider, "
        + "IX509CertificateProvider). Use the built-in IMaskinportenClient instead: inject it and call "
        + "GetAccessToken(scopes)/GetAltinnExchangedToken(scopes), or attach authorization to an HttpClient "
        + "registration with UseMaskinportenAuthorization(scopes)/UseMaskinportenAltinnAuthorization(scopes). "
        + "Configuration comes from a MaskinportenSettings section (authority/clientId/jwk), which Studio "
        + "provisions automatically when the app is deployed - so in most cases the app no longer needs to "
        + "supply credentials at all. Note that the built-in client authenticates with a JWK: if this app "
        + "authenticates with a PKCS#12 certificate or a certificate-store thumbprint, register a JWK in "
        + "Maskinporten before porting. Usages found:";

    private const string EformidlingSummary =
        "EformidlingStatusCheckEventHandler is removed in v9. It is not replaced by the Maskinporten client - "
        + "register eFormidling with AddEFormidlingServices2<TM, TR>(configuration), which sets up the status "
        + "check for you. Remove these references and any DI registration of the handler. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedMaskinportenShimDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var maskinportenMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedMaskinportenTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedMaskinportenTypes))
                .Concat(CSharpSyntaxQueries.InvokedMethods(file, _removedMaskinportenMethods))
        );

        var eformidlingMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedEformidlingTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedEformidlingTypes))
        );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(MaskinportenSummary, maskinportenMatches),
            WarnOnlyDetector.Report(EformidlingSummary, eformidlingMatches)
        );
    }
}
