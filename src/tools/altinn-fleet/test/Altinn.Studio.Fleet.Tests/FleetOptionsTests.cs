using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.Sync;
using Microsoft.Extensions.Configuration;

namespace Altinn.Studio.Fleet.Tests;

public sealed class FleetOptionsTests
{
    [Theory]
    [InlineData("prod", "ssb.apps.altinn.no")]
    [InlineData("tt02", "ssb.apps.tt02.altinn.no")]
    [InlineData("at22", "ssb.apps.at22.altinn.cloud")]
    [InlineData("yt01", "ssb.apps.yt01.altinn.cloud")]
    public void AppsHostName_DependsOnTheEnvironment(string environment, string expected)
    {
        Assert.Equal(expected, Host(new FleetOptions(), RuntimeEnvironment.Parse(environment), "ssb"));
    }

    [Fact]
    public void FromConfiguration_OverridesWhatItSetsAndKeepsTheDefaultsForTheRest()
    {
        FleetOptions options = FleetOptions.FromConfiguration(
            Section(
                ("ServiceOwnerRegistry", "https://cdn.example.com/orgs.json"),
                ("AppsHosts:tt02", "{org}.apps.example.com"),
                ("StudioHosts:1:Name", "staging"),
                ("StudioHosts:1:HostName", "studio-staging.example.com"),
                ("StudioHosts:0:Name", "prod"),
                ("StudioHosts:0:HostName", "studio.example.com")
            )
        );

        Assert.Equal(new Uri("https://cdn.example.com/orgs.json"), options.ServiceOwnerRegistry);
        Assert.Equal("ttd.apps.example.com", Host(options, RuntimeEnvironment.TT02, "ttd"));
        Assert.Equal("ttd.apps.altinn.no", Host(options, RuntimeEnvironment.Production, "ttd"));
        Assert.Equal("ttd.apps.at22.altinn.cloud", Host(options, RuntimeEnvironment.Parse("at22"), "ttd"));
        Assert.Equal(
            ["prod studio.example.com", "staging studio-staging.example.com"],
            options.StudioHosts.Select(h => $"{h.Name} {h.HostName}")
        );
    }

    [Fact]
    public void FromConfiguration_WithoutValuesGivesTheDefaults()
    {
        FleetOptions options = FleetOptions.FromConfiguration(Section());
        var defaults = new FleetOptions();

        Assert.Equal(defaults.ServiceOwnerRegistry, options.ServiceOwnerRegistry);
        Assert.Equal(defaults.StudioHosts, options.StudioHosts);
        Assert.Equal(defaults.AppsHosts, options.AppsHosts);
    }

    [Theory]
    [InlineData("ServiceOwnerRegistry", "not a url")]
    [InlineData("AppsHosts:tt02", "apps.example.com")]
    [InlineData("AppsHosts:not-an-env", "{org}.example.com")]
    [InlineData("OtherAppsHost", "apps.example.com")]
    [InlineData("StudioHosts:0:Name", "prod")]
    public void FromConfiguration_RejectsInvalidValues(string key, string value)
    {
        FleetException exception = Assert.Throws<FleetException>(() =>
            FleetOptions.FromConfiguration(
                new ConfigurationBuilder()
                    .AddInMemoryCollection([new($"Fleet:{key}", value)])
                    .Build()
                    .GetSection("Fleet")
            )
        );

        Assert.Contains($"Fleet:{key.Split(':')[0]}", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Sync_AsksOnlyTheConfiguredStudioInstallations()
    {
        using var context = new FleetTestContext(
            FleetOptions.FromConfiguration(
                Section(("StudioHosts:0:Name", "prod"), ("StudioHosts:0:HostName", "altinn.studio"))
            )
        );
        context.Altinn.Deploy("prod", "ttd", "app-one", "1", host: "staging.altinn.studio");

        EnvironmentSyncResult result = await context.SyncProd();

        Assert.Single(result.Failures);
        Assert.Equal(["altinn.studio"], context.Credentials.Asked);
        Assert.Equal(0, context.Altinn.Count("staging.altinn.studio"));
    }

    private static string Host(FleetOptions options, RuntimeEnvironment environment, string org) =>
        options.AppsHost(environment).TryRender(ServiceOwnerCode.Parse(org), environment, out HostName? host)
            ? host.Value
            : throw new InvalidOperationException($"No host for {org} in {environment}");

    [Theory]
    [InlineData("{org}.apps.altinn.no", true)]
    [InlineData("{org}.apps.{env}.example.com", true)]
    [InlineData("apps.altinn.no", false)]
    [InlineData("{org}..altinn.no", false)]
    [InlineData("{org}.apps.altinn.no/path", false)]
    [InlineData("-{org}.altinn.no", false)]
    public void HostTemplate_MustGiveAHostName(string template, bool valid)
    {
        Assert.Equal(valid, HostTemplate.TryParse(template, out _));
    }

    [Fact]
    public void HostTemplate_GivesNoHostWhenTheServiceOwnerCodeMakesALabelTooLong()
    {
        HostTemplate template = HostTemplate.Parse("{org}.apps.altinn.no");
        HostTemplate longLabel = HostTemplate.Parse("{org}-" + new string('x', 30) + ".altinn.no");
        ServiceOwnerCode longest = ServiceOwnerCode.Parse(new string('a', 40));

        Assert.False(longLabel.TryRender(longest, RuntimeEnvironment.Production, out _));
        Assert.True(longLabel.TryRender(ServiceOwnerCode.Parse("ttd"), RuntimeEnvironment.Production, out _));
        Assert.True(
            template.TryRender(ServiceOwnerCode.Parse("ttd"), RuntimeEnvironment.Production, out HostName? host)
        );
        Assert.Equal("ttd.apps.altinn.no", host.Value);
    }

    private static IConfiguration Section(params (string Key, string Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>($"Fleet:{v.Key}", v.Value)))
            .Build()
            .GetSection("Fleet");
}
