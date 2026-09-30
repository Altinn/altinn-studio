using Altinn.Studio.Gateway.Api.Authentication;
using Microsoft.Extensions.Configuration;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class MaskinportenConfigurationTests
{
    private const string FakeMetadataAddress =
        "http://fake-oidc.default.svc.cluster.local/.well-known/oauth-authorization-server";
    private const string ProductionMetadataAddress = "https://maskinporten.no/.well-known/oauth-authorization-server";
    private const string TestMetadataAddress = "https://test.maskinporten.no/.well-known/oauth-authorization-server";

    public static TheoryData<string, string[]> EnvironmentMetadataAddresses =>
        new()
        {
            { "Development", [TestMetadataAddress, ProductionMetadataAddress] },
            { "at22", [TestMetadataAddress, ProductionMetadataAddress] },
            { "at23", [TestMetadataAddress, ProductionMetadataAddress] },
            { "at24", [TestMetadataAddress, ProductionMetadataAddress] },
            { "local", [FakeMetadataAddress] },
            { "prod", [ProductionMetadataAddress] },
            { "tt02", [TestMetadataAddress, ProductionMetadataAddress] },
            { "yt01", [TestMetadataAddress, ProductionMetadataAddress] },
        };

    [Theory]
    [MemberData(nameof(EnvironmentMetadataAddresses))]
    public void EnvironmentDefinesExpectedMetadataAddresses(string environment, string[] expected)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json")
            .AddJsonFile($"appsettings.{environment}.json")
            .Build();

        var settings = configuration.GetRequiredSection("Maskinporten").Get<MaskinportenSettings>();

        Assert.NotNull(settings);
        Assert.Equal(expected, settings.MetadataAddresses);
    }
}
