namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the obsolete Maskinporten surface that <c>Altinn.App.Core</c> used to expose
/// as a thin shim over the external <c>Altinn.ApiClients.Maskinporten</c> package: the
/// <c>IMaskinportenTokenProvider</c>/<c>MaskinportenJwkTokenProvider</c> pair, the
/// <c>AddMaskinportenJwkTokenProvider</c> registration, the <c>IX509CertificateProvider</c> abstraction,
/// and the <c>EformidlingStatusCheckEventHandler</c> that consumed them. All of these are gone in v9,
/// replaced by the built-in <c>IMaskinportenClient</c>.
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
    // Matching is exact, so `EformidlingStatusCheckEventHandler2` - which survives in v9 as an internal
    // type registered by AddEFormidlingServices2 - is not caught by the v1 handler entry here.
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IMaskinportenTokenProvider",
        "MaskinportenJwkTokenProvider",
        "IX509CertificateProvider",
        "EformidlingStatusCheckEventHandler",
    };

    // Only the registration extension is matched by name. The removed provider's own methods (`GetToken`,
    // `GetAltinnExchangedToken`) are deliberately not: `GetAltinnExchangedToken` is also a method on the
    // replacement IMaskinportenClient, so matching it would flag exactly the code apps are being told to
    // write. Call sites are reached via the interface reference instead.
    private static readonly IReadOnlySet<string> _removedMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "AddMaskinportenJwkTokenProvider",
    };

    private const string Summary =
        "The obsolete Maskinporten types in Altinn.App.Core are removed in v9 "
        + "(IMaskinportenTokenProvider, MaskinportenJwkTokenProvider, AddMaskinportenJwkTokenProvider, "
        + "IX509CertificateProvider, EformidlingStatusCheckEventHandler). Use the built-in IMaskinportenClient "
        + "instead: inject it and call GetAccessToken(scopes)/GetAltinnExchangedToken(scopes), or attach "
        + "authorization to an HttpClient registration with UseMaskinportenAuthorization(scopes)/"
        + "UseMaskinportenAltinnAuthorization(scopes). Configuration comes from a MaskinportenSettings section "
        + "(authority/clientId/jwk), which Studio provisions automatically when the app is deployed - so in most "
        + "cases the app no longer needs to supply credentials at all. Note that the built-in client "
        + "authenticates with a JWK: if this app authenticates with a PKCS#12 certificate or a certificate-store "
        + "thumbprint, register a JWK in Maskinporten before porting. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedMaskinportenShimDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedTypes))
                .Concat(CSharpSyntaxQueries.InvokedMethods(file, _removedMethods))
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }
}
