using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Common.Cdn;
using Altinn.Studio.Common.Domain;
using Xunit;

namespace Altinn.Studio.Common.Tests.Cdn;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class AltinnEnvironmentsRegistryTests
{
    // The shape of https://altinncdn.no/config/environments.json, with entries the registry leaves out.
    private const string Document = """
        {
          "environments": [
            {
              "platformUrl": "https://platform.at22.altinn.cloud",
              "hostname": "at22.altinn.cloud",
              "appPrefix": "apps",
              "platformPrefix": "platform",
              "name": "at22",
              "type": "test"
            },
            { "hostname": "tt02.altinn.no", "appPrefix": "apps", "name": "tt02", "type": "test" },
            { "hostname": "altinn.no", "appPrefix": "apps", "name": "production", "type": "production" },
            { "hostname": "moon.altinn.cloud", "appPrefix": "apps", "name": "moon" },
            { "hostname": "yt01.altinn.cloud", "name": "yt01" },
            { "hostname": "https://at23.altinn.cloud", "appPrefix": "apps", "name": "at23" },
            { "hostname": "other.altinn.no", "appPrefix": "apps", "name": "prod" },
            7
          ]
        }
        """;

    [Theory]
    [InlineData("prod", "ttd.apps.altinn.no")]
    [InlineData("tt02", "ttd.apps.tt02.altinn.no")]
    [InlineData("at22", "ttd.apps.at22.altinn.cloud")]
    public void TryGetAppsHost_MakesTheHostOfAServiceOwnersAppsFromTheEnvironment(string environment, string expected)
    {
        AltinnEnvironmentsRegistry registry = Parse(Document);

        Assert.True(
            registry.TryGetAppsHost(
                ServiceOwnerCode.Parse("ttd"),
                RuntimeEnvironment.Parse(environment),
                out string? host
            )
        );
        Assert.Equal(expected, host);
    }

    [Fact]
    public void TryParse_LeavesOutWhatIsNotAnEnvironmentWithAHost()
    {
        AltinnEnvironmentsRegistry registry = Parse(Document);

        Assert.Equal(["at22", "prod", "tt02"], registry.Environments.Select(e => e.Name).Order(StringComparer.Ordinal));
        // Not an environment, no app prefix, a URL rather than a host name, production named again, and not an object.
        Assert.Equal(["moon", "yt01", "at23", "prod", "7"], registry.Skipped);
        Assert.False(
            registry.TryGetAppsHost(ServiceOwnerCode.Parse("ttd"), RuntimeEnvironment.Parse("yt01"), out string? host)
        );
        Assert.Null(host);
    }

    [Fact]
    public void TryParse_MakesHostsByTheGivenPattern()
    {
        Assert.True(
            AltinnEnvironmentsRegistry.TryParse(
                Encoding.UTF8.GetBytes(Document),
                "{appPrefix}-{org}.{hostname}",
                out AltinnEnvironmentsRegistry? registry
            )
        );

        Assert.True(registry.TryGetAppsHost(ServiceOwnerCode.Parse("ssb"), RuntimeEnvironment.TT02, out string? host));
        Assert.Equal("apps-ssb.tt02.altinn.no", host);
    }

    [Fact]
    public async Task AppsHost_GivesOnlyEnvironmentsTheDocumentHas()
    {
        EnvironmentRegistry registry = Parse(Document);
        ServiceOwnerCode ttd = ServiceOwnerCode.Parse("ttd");

        Assert.Equal(
            "ttd.apps.altinn.no",
            await registry.AppsHost(ttd, RuntimeEnvironment.Production, TestContext.Current.CancellationToken)
        );
        Assert.Null(
            await registry.AppsHost(ttd, RuntimeEnvironment.Parse("at24"), TestContext.Current.CancellationToken)
        );
        Assert.Equal(3, (await registry.List(TestContext.Current.CancellationToken)).Count);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("{}")]
    [InlineData("{\"environments\": {}}")]
    [InlineData("{\"environments\": [{\"name\": \"tt02\"")]
    public void TryParse_RefusesWhatIsNotTheDocument(string json)
    {
        Assert.False(
            AltinnEnvironmentsRegistry.TryParse(Encoding.UTF8.GetBytes(json), out AltinnEnvironmentsRegistry? registry)
        );
        Assert.Null(registry);
    }

    [Fact]
    public void Environments_CannotBeChanged()
    {
        Assert.True(
            Assert
                .IsType<System.Collections.Generic.ICollection<RuntimeEnvironment>>(
                    Parse(Document).Environments,
                    exactMatch: false
                )
                .IsReadOnly
        );
    }

    private static AltinnEnvironmentsRegistry Parse(string json)
    {
        Assert.True(
            AltinnEnvironmentsRegistry.TryParse(Encoding.UTF8.GetBytes(json), out AltinnEnvironmentsRegistry? registry)
        );
        return registry;
    }
}
