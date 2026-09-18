using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class MaskinportenSettingsSectionDetectorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    /// <summary>
    /// The detector is handed the app repo root (matching <c>V8Tov9UpgradeOptions.ProjectFolder</c>) and the
    /// section paths the code bound the built-in client to. The default section is always in scope.
    /// </summary>
    private MigrationResult Detect(params string[] boundSections) =>
        new MaskinportenSettingsSectionDetector(
            _app.Root,
            boundSections.ToHashSet(StringComparer.OrdinalIgnoreCase)
        ).Detect();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    private const string Command = "studioctl app maskinporten set";

    // --- the default section --------------------------------------------------------------------

    /// <summary>
    /// The textbook v8 shape under the default name: the key arrives from an env var or secret file and only
    /// the client id is checked in. In v9 nothing reads it, and the report says where to paste it from.
    /// </summary>
    [Fact]
    public void DefaultSection_BuiltInShape_IsReportedWithTheCommand()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "clientId": "some-client-id",
                "jwkBase64": "eyJraWQiOiJ0ZXN0In0="
              }
            }
            """
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("which v9 never reads") && w.Contains(Command));
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: MaskinportenSettings"));
        // Bound, so not also reported as a leftover.
        Assert.DoesNotContain(result.Warnings, w => w.Contains("look like credentials"));
    }

    /// <summary>
    /// A section carrying only <c>authority</c> is just as dead as one carrying credentials.
    /// </summary>
    [Fact]
    public void DefaultSection_WithOnlyAuthority_IsReported()
    {
        _app.Write(
            "appsettings.json",
            """{ "MaskinportenSettings": { "authority": "https://test.maskinporten.no/" } }"""
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: MaskinportenSettings"));
    }

    [Fact]
    public void DevelopmentSettings_AreReportedToo()
    {
        _app.Write("appsettings.json", """{ "Logging": {} }""");
        _app.Write(
            "appsettings.Development.json",
            """{ "MaskinportenSettings": { "clientId": "dev-client", "authority": "https://test.maskinporten.no/" } }"""
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.Development.json"));
        Assert.DoesNotContain(result.Warnings, w => w.Contains("appsettings.json:"));
    }

    /// <summary>
    /// .NET configuration keys are case-insensitive, so a differently cased section is the same section.
    /// </summary>
    [Fact]
    public void DefaultSectionNameMatchIsCaseInsensitive()
    {
        _app.Write(
            "appsettings.json",
            """{ "maskinportensettings": { "clientId": "x", "authority": "https://test.maskinporten.no/" } }"""
        );

        var result = Detect();

        Assert.NotEmpty(result.Warnings);
    }

    /// <summary>
    /// The external package binds the same default name and still reads it; the built-in client was never
    /// pointed at it explicitly, so there is nothing dead to report.
    /// </summary>
    [Fact]
    public void DefaultSection_ExternalPackageShape_ReportsNothing()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "ClientId": "some-client-id",
                "Environment": "test",
                "Scope": "altinn:serviceowner/instances.read",
                "EncodedJwk": "eyJraWQiOiJ0ZXN0In0="
              }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void DefaultSection_CertificateBasedExternalShape_ReportsNothing()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "ClientId": "some-client-id",
                "Environment": "prod",
                "CertificatePkcs12Path": "/certs/client.p12"
              }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    /// <summary>
    /// A built-in-only key beside external ones says the built-in client was meant - a v8 section that grew a
    /// <c>Scope</c> from a copied example, say. The external package never reads <c>jwkBase64</c>, so nothing
    /// reads this object in v9, and it must be reported.
    /// </summary>
    [Fact]
    public void DefaultSection_BuiltInKeyBesideExternalKeys_IsStillReported()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "clientId": "x",
                "Scope": "altinn:serviceowner/instances.read",
                "jwkBase64": "eyJraWQiOiJ0ZXN0In0="
              }
            }
            """
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: MaskinportenSettings"));
    }

    // --- sections the code named ------------------------------------------------------------------

    /// <summary>
    /// The common v8 shape: an app-prefixed section, bound with <c>ConfigureMaskinportenClient("...")</c>. The
    /// name in the call is what finds the section, and the report names it by file and path.
    /// </summary>
    [Fact]
    public void SectionNamedInTheCode_IsReportedWithItsPath()
    {
        _app.Write(
            "Program.cs",
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
            {
                services.ConfigureMaskinportenClient("my-app--MaskinportenSettings");
            }
            """
        );
        _app.Write(
            "appsettings.Development.json",
            """
            {
              "my-app--MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "clientId": "dev-client"
              }
            }
            """
        );

        var bound = new MaskinportenClientOverrideDetector(Scanner()).NamedSections();
        var result = new MaskinportenSettingsSectionDetector(_app.Root, bound).Detect();

        Assert.Contains("my-app--MaskinportenSettings", bound);
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.Development.json: my-app--MaskinportenSettings"));
        Assert.DoesNotContain(result.Warnings, w => w.Contains("look like credentials"));
    }

    [Fact]
    public void NestedSectionPath_IsResolved()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "Integrations": {
                "Fiks": {
                  "Maskinporten": { "authority": "https://test.maskinporten.no/", "clientId": "fiks-client" }
                }
              }
            }
            """
        );

        var result = Detect("integrations:fiks:maskinporten");

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: Integrations:Fiks:Maskinporten"));
    }

    /// <summary>
    /// The JSON provider flattens a key that contains the separator, so <c>"Integrations:Fiks": { "Maskinporten"
    /// ... }</c> is the same configuration path as the nested spelling and has to resolve too.
    /// </summary>
    [Fact]
    public void FlattenedPrefixKey_IsResolved()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "Integrations:Fiks": {
                "Maskinporten": { "authority": "https://test.maskinporten.no/", "clientId": "fiks-client" }
              }
            }
            """
        );

        var result = Detect("Integrations:Fiks:Maskinporten");

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: Integrations:Fiks:Maskinporten"));
    }

    /// <summary>
    /// A section the code pointed the built-in client at is dead whatever its shape - the binding is gone.
    /// </summary>
    [Fact]
    public void NamedSection_WithExternalShape_IsStillReported()
    {
        _app.Write(
            "appsettings.json",
            """{ "my-client": { "ClientId": "x", "Environment": "test", "EncodedJwk": "eyJraWQiOiJ0ZXN0In0=" } }"""
        );

        var result = Detect("my-client");

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: my-client"));
    }

    /// <summary>
    /// A named section that no settings file holds - credentials that lived in a key vault, say - has nothing
    /// to report here; the call site itself is reported by the C# detector.
    /// </summary>
    [Fact]
    public void NamedSection_AbsentFromTheFiles_ReportsNothing()
    {
        _app.Write("appsettings.json", """{ "Logging": {} }""");

        var result = Detect("KeyVault:Only:MaskinportenSettings");

        Assert.Empty(result.Warnings);
    }

    // --- leftovers ------------------------------------------------------------------------------

    /// <summary>
    /// <c>jwkBase64</c> is a name only the built-in model had, so an object carrying it under any name is
    /// credentials for that client - bound by nothing, so most likely a leftover.
    /// </summary>
    [Fact]
    public void UnboundObjectWithABuiltInKey_IsAdvisedAsLeftover()
    {
        _app.Write(
            "appsettings.json",
            """{ "old-reporting": { "clientId": "old-client", "jwkBase64": "eyJraWQiOiJ0ZXN0In0=" } }"""
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("look like credentials"));
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: old-reporting"));
        Assert.DoesNotContain(result.Warnings, w => w.Contains("which v9 never reads"));
    }

    [Fact]
    public void UnboundAuthorityUnderAMaskinportenName_IsAdvisedAsLeftover()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "Integrations": {
                "MaskinportenReporting": { "authority": "https://maskinporten.no/", "clientId": "rep-client" }
              }
            }
            """
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: Integrations:MaskinportenReporting"));
    }

    /// <summary>
    /// OpenID Connect options are configured with <c>Authority</c> and <c>ClientId</c> too. They are not
    /// Maskinporten credentials, and the false positive would erode trust in the whole report.
    /// </summary>
    [Fact]
    public void OpenIdConnectOptions_AreNotMistakenForMaskinporten()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "Authentication": {
                "Authority": "https://login.microsoftonline.com/common/v2.0",
                "ClientId": "11111111-2222-3333-4444-555555555555",
                "ClientSecret": "not-a-jwk"
              }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void UnboundObjectWithBuiltInKeyBesideExternalKeys_IsAdvisedAsLeftover()
    {
        _app.Write(
            "appsettings.json",
            """{ "reporting": { "clientId": "x", "Scope": "s", "jwkBase64": "eyJraWQiOiJ0ZXN0In0=" } }"""
        );

        var result = Detect();

        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json: reporting"));
    }

    [Fact]
    public void UnboundObjectWithExternalKeys_ReportsNothing()
    {
        _app.Write(
            "appsettings.json",
            """{ "reporting": { "ClientId": "x", "Environment": "test", "EncodedJwk": "eyJraWQiOiJ0ZXN0In0=", "Scope": "s" } }"""
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    // --- plumbing -------------------------------------------------------------------------------

    /// <summary>
    /// Nothing here blocks the upgrade: a section that is never read breaks nothing, it is only clutter
    /// (and, when it holds a key, a key worth removing).
    /// </summary>
    [Fact]
    public void DeadSection_DoesNotBlockTheUpgrade()
    {
        _app.Write("appsettings.json", """{ "MaskinportenSettings": { "clientId": "some-client-id" } }""");

        var result = Detect();

        Assert.NotEmpty(result.Warnings);
        Assert.Empty(result.Todos);
    }

    [Fact]
    public void VendoredDependencySettings_AreIgnored()
    {
        _app.Write(
            "ui/node_modules/some-pkg/appsettings.json",
            """{ "MaskinportenSettings": { "clientId": "some-client-id", "jwkBase64": "eyJraWQiOiJ0ZXN0In0=" } }"""
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void NoMaskinportenConfiguration_ReportsNothing()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "Logging": { "LogLevel": { "Default": "Information" } }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void AppSettingsWithCommentsAndTrailingCommas_IsStillParsed()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              // credentials for our reporting integration
              "MaskinportenSettings": {
                "clientId": "some-client-id",
              },
            }
            """
        );

        var result = Detect();

        Assert.NotEmpty(result.Warnings);
    }
}
