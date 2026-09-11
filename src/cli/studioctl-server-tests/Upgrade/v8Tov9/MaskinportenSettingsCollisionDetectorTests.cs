using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class MaskinportenSettingsCollisionDetectorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    /// <summary>
    /// The detector is handed the app repo root (matching <c>V8Tov9UpgradeOptions.ProjectFolder</c>), and
    /// finds configuration anywhere beneath it - <c>App/appsettings.json</c> in a normal app.
    /// </summary>
    private MigrationResult Detect() => new MaskinportenSettingsCollisionDetector(_app.Root).Detect();

    [Fact]
    public void ExternalShapedSection_IsReportedAsACollision()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "Environment": "test",
                "ClientId": "some-client-id",
                "EncodedJwk": "eyJraWQiOiJ0ZXN0In0=",
                "Scope": "altinn:serviceowner"
              }
            }
            """
        );

        var result = Detect();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(result.Warnings, w => w.Contains("provisioned Maskinporten client reads"));
        Assert.Contains(
            result.Warnings,
            w => w.Contains("appsettings.json") && w.Contains("EncodedJwk") && w.Contains("Environment")
        );
    }

    [Fact]
    public void CertificateBasedSection_IsReportedAsACollision()
    {
        _app.Write(
            "appsettings.Production.json",
            """
            {
              "MaskinportenSettings": {
                "ClientId": "some-client-id",
                "CertificatePkcs12Path": "/secrets/cert.p12",
                "CertificatePkcs12Password": "hunter2"
              }
            }
            """
        );

        var result = Detect();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("appsettings.Production.json") && w.Contains("CertificatePkcs12Path")
        );
    }

    /// <summary>
    /// .NET configuration keys are case-insensitive, so a differently-cased section name collides just
    /// the same and must not slip past the check.
    /// </summary>
    [Fact]
    public void SectionNameMatchIsCaseInsensitive()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "maskinportensettings": {
                "environment": "test",
                "encodedJwk": "eyJraWQiOiJ0ZXN0In0="
              }
            }
            """
        );

        var result = Detect();

        Assert.NotEmpty(result.Todos);
    }

    /// <summary>
    /// A checked-in built-in credential is not merely redundant. The provisioned file is applied after
    /// appsettings.json and merges key by key, and <c>MaskinportenSettings.ConvertJwk</c> lets a
    /// <c>jwkBase64</c> win over a provisioned <c>jwk</c> - so the app signs with its own key under the
    /// provisioned client id, which Maskinporten rejects. Same outcome as the external-shape collision.
    /// </summary>
    [Fact]
    public void BuiltInShapedSectionWithCredentials_Blocks()
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

        Assert.NotEmpty(result.Todos);
        Assert.Contains(result.Warnings, w => w.Contains("keys the platform also provisions"));
        Assert.Contains(
            result.Warnings,
            w => w.Contains("appsettings.json") && w.Contains("clientId") && w.Contains("jwkBase64")
        );
    }

    /// <summary>
    /// The textbook v8 shape: the key arrives from an env var or secret file and only the client id is
    /// checked in. That id is exactly what the provisioned file overwrites, so silence here would miss the
    /// most common real collision.
    /// </summary>
    [Fact]
    public void SectionWithOnlyClientId_Blocks()
    {
        _app.Write(
            "appsettings.json",
            """
            { "MaskinportenSettings": { "ClientId": "app-own-client" } }
            """
        );

        var result = Detect();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json") && w.Contains("ClientId"));
    }

    /// <summary>
    /// A deployed environment never loads appsettings.Development.json, so credentials there are a local
    /// concern. The repo's own test apps use exactly this pattern.
    /// </summary>
    [Fact]
    public void DevelopmentSettings_AreReportedWithoutBlocking()
    {
        _app.Write(
            "appsettings.Development.json",
            """
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "clientId": "local-dev-client",
                "jwkBase64": "eyJraWQiOiJ0ZXN0In0="
              }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Todos);
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.Development.json"));
        Assert.Contains(result.Warnings, w => w.Contains("development only"));
    }

    /// <summary>
    /// <c>authority</c> carries no identity, and the provisioned value overriding it is the correct
    /// outcome rather than a hazard, so a section carrying only that must produce no noise at all.
    /// </summary>
    [Fact]
    public void SectionWithOnlyAuthority_ReportsNothing()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/"
              }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void VendoredDependencySettings_AreIgnored()
    {
        _app.Write(
            "ui/node_modules/some-pkg/appsettings.json",
            """
            { "MaskinportenSettings": { "Environment": "test", "EncodedJwk": "x" } }
            """
        );

        var result = Detect();

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void NoMaskinportenSection_ReportsNothing()
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

        Assert.Empty(result.Todos);
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
                "Environment": "test",
                "EncodedJwk": "eyJraWQiOiJ0ZXN0In0=",
              },
            }
            """
        );

        var result = Detect();

        Assert.NotEmpty(result.Todos);
    }

    /// <summary>
    /// An unparsable appsettings file is skipped rather than reported: a JSON complaint from a
    /// Maskinporten check would be a confusing way to learn the file is malformed.
    /// </summary>
    [Fact]
    public void UnparseableAppSettings_IsSkippedSilently()
    {
        _app.Write("appsettings.json", "{ this is not json");

        var result = Detect();

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void BuildOutputIsIgnored()
    {
        _app.Write(
            "obj/Debug/appsettings.json",
            """
            {
              "MaskinportenSettings": { "Environment": "test", "EncodedJwk": "x" }
            }
            """
        );

        var result = Detect();

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void CollisionAndCheckedInKey_AreReportedTogether()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "MaskinportenSettings": { "Environment": "test", "EncodedJwk": "x" }
            }
            """
        );
        _app.Write(
            "appsettings.Development.json",
            """
            {
              "MaskinportenSettings": { "authority": "https://test.maskinporten.no/", "jwk": { "kid": "x" } }
            }
            """
        );

        var result = Detect();

        // The deployed file blocks; the development one is reported under its own summary but only as a
        // local concern, and must not be what drives the exit code.
        Assert.NotEmpty(result.Todos);
        Assert.Contains(result.Warnings, w => w.Contains("provisioned Maskinporten client reads"));
        Assert.Contains(result.Warnings, w => w.Contains("keys the platform also provisions"));
        Assert.Contains(
            result.Warnings,
            w => w.Contains("appsettings.Development.json") && w.Contains("development only")
        );
    }
}
