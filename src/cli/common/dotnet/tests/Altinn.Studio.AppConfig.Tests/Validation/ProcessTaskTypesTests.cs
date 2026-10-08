using System.Text.RegularExpressions;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed partial class ProcessTaskTypesTests
{
    [Fact]
    public void TaskTypes_MatchAltinnAppCore()
    {
        var source = File.ReadAllText(
            RepoFiles.Path("src", "App", "backend", "src", "Altinn.App.Core", "Constants", "AltinnTaskTypes.cs")
        );
        var declared = ConstantValue().Matches(source).Select(m => m.Groups[1].Value).Order(StringComparer.Ordinal);

        Assert.Equal(declared, ProcessTaskTypes.All.Order(StringComparer.Ordinal));
    }

    [GeneratedRegex("""public const string \w+ = "([^"]+)";""")]
    private static partial Regex ConstantValue();
}
