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

        Assert.True(result.ManualActionRequired);
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

        Assert.True(result.ManualActionRequired);
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

        Assert.True(result.ManualActionRequired);
    }

    [Fact]
    public void BuiltInShapedSectionWithKey_IsAdvisedButDoesNotBlock()
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

        Assert.False(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("provisions these automatically"));
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.json") && w.Contains("jwkBase64"));
    }

    /// <summary>
    /// A section carrying only non-credential built-in keys is exactly what the provisioned client expects
    /// and must produce no noise at all.
    /// </summary>
    [Fact]
    public void BuiltInShapedSectionWithoutKey_ReportsNothing()
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

        Assert.False(result.ManualActionRequired);
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

        Assert.False(result.ManualActionRequired);
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

        Assert.True(result.ManualActionRequired);
    }

    /// <summary>
    /// An unparseable appsettings file is skipped rather than reported: a JSON complaint from a
    /// Maskinporten check would be a confusing way to learn the file is malformed.
    /// </summary>
    [Fact]
    public void UnparseableAppSettings_IsSkippedSilently()
    {
        _app.Write("appsettings.json", "{ this is not json");

        var result = Detect();

        Assert.False(result.ManualActionRequired);
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

        Assert.False(result.ManualActionRequired);
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

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("provisioned Maskinporten client reads"));
        Assert.Contains(result.Warnings, w => w.Contains("provisions these automatically"));
        Assert.Contains(result.Warnings, w => w.Contains("appsettings.Development.json") && w.Contains("jwk"));
    }
}
