using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Tests.Constants;

public class AltinnEnvironmentsTest
{
    private static readonly Random _random = new();

    [Fact]
    public void GetHostingEnvironment_MapsEnvironmentsCorrectly()
    {
        AssertEnvironmentMapping(HostingEnvironment.Development, ["development", "dev", "local", "localtest"]);
        AssertEnvironmentMapping(
            HostingEnvironment.Staging,
            ["staging", "test", "at22", "at23", "at24", "tt02", "yt01"]
        );
        AssertEnvironmentMapping(HostingEnvironment.Production, ["production", "prod", "produksjon"]);
    }

    private static void AssertEnvironmentMapping(
        HostingEnvironment expectedEnvironment,
        IEnumerable<string> environmentLabels
    )
    {
        foreach (var env in environmentLabels)
        {
            var result = AltinnEnvironments.GetHostingEnvironment(RandomCapitalisation(env));
            Assert.Equal(expectedEnvironment, result);
        }
    }

    private static string RandomCapitalisation(string input)
    {
        return new string(input.Select(c => _random.Next(2) == 0 ? char.ToUpper(c) : char.ToLower(c)).ToArray());
    }
}
