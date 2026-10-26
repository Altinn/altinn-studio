using System.Xml.Linq;
using Altinn.App.Analyzers.Process;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Analyzers.Tests.Process;

/// <summary>
/// Pins the analyzer's copy of the environment names, and how it picks the entry for an environment, to
/// <see cref="AltinnEnvironments"/> and <see cref="AltinnTaskExtension.GetConfigForEnvironment"/>. If it fails, the
/// runtime changed, and <see cref="HostingEnvironments"/> must follow.
/// </summary>
public class HostingEnvironmentsTests
{
    [Fact]
    public void The_Names_Match_The_Runtime()
    {
        var expected = AltinnEnvironments
            .Map.OrderBy(pair => pair.Key.ToString(), StringComparer.Ordinal)
            .Select(pair => $"{pair.Key}: {string.Join(", ", pair.Value)}");

        var actual = HostingEnvironments
            .Names.OrderBy(pair => pair.Key, StringComparer.Ordinal)
            .Select(pair => $"{pair.Key}: {string.Join(", ", pair.Value)}");

        Assert.Equal(expected, actual);
        Assert.Equal(
            AltinnEnvironments.Map.Keys.Select(k => k.ToString()).Order(StringComparer.Ordinal),
            HostingEnvironments.All.Order(StringComparer.Ordinal)
        );
    }

    [Theory]
    [InlineData("dev")]
    [InlineData("Development")]
    [InlineData("LOCALTEST")]
    [InlineData("tt02")]
    [InlineData("Staging")]
    [InlineData("Prod")]
    [InlineData("produksjon")]
    [InlineData("tt03")]
    [InlineData(" prod")]
    [InlineData("prod ")]
    [InlineData("İ")]
    public void A_Name_Maps_Like_The_Runtime(string name)
    {
        var runtime = AltinnEnvironments.GetHostingEnvironment(name);

        Assert.Equal(runtime == HostingEnvironment.Unknown ? null : runtime.ToString(), HostingEnvironments.Map(name));
    }

    [Theory]
    [InlineData("")]
    [InlineData("global")]
    [InlineData("global; env=prod:prod")]
    [InlineData("env=prod:prod; global")]
    [InlineData("global; env=prod:")]
    [InlineData("env=prod:first; env=production:second; global")]
    [InlineData("env=tt03:unknown")]
    [InlineData("env=tt03:unknown; global")]
    [InlineData("env= :blank-env; env=dev:dev")]
    [InlineData("global; env=dev:dev; env=TT02:test; env=yt01:")]
    [InlineData("global; global2")]
    public void The_Entry_For_An_Environment_Is_Picked_Like_The_Runtime(string entries)
    {
        // Each entry is "env=<env>:<value>", or a value without env.
        var configs = entries
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(entry =>
                entry.StartsWith("env=", StringComparison.Ordinal)
                    ? new AltinnEnvironmentConfig
                    {
                        Environment = entry.Substring(4, entry.IndexOf(':') - 4),
                        Value = entry.Substring(entry.IndexOf(':') + 1),
                    }
                    : new AltinnEnvironmentConfig { Value = entry }
            )
            .ToList();
        var elements = configs
            .Select(config =>
                config.Environment is null
                    ? new XElement("entry", config.Value)
                    : new XElement("entry", new XAttribute("env", config.Environment), config.Value)
            )
            .ToList();

        foreach (var environment in Enum.GetValues<HostingEnvironment>().Where(e => e != HostingEnvironment.Unknown))
        {
            var runtime = AltinnTaskExtension.GetConfigForEnvironment(environment, configs);
            var analyzer = HostingEnvironments.Resolve(elements, environment.ToString());

            Assert.Equal(
                runtime is null ? -1 : configs.IndexOf(runtime),
                analyzer is null ? -1 : elements.IndexOf(analyzer)
            );
        }
    }
}
