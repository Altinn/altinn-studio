using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class CleanAppTests
{
    [Fact]
    public void Baseline_ProducesNoErrors()
    {
        var app = AppConfigEngine.Open(BaselineApp.Load()).Build();
        AssertNoErrors(ValidationEngine.Run(app), "baseline app");
    }

    [Theory]
    [InlineData("anonymous-stateless-app")]
    [InlineData("expression-validation-test")]
    [InlineData("multiple-datamodels-test")]
    [InlineData("signing-test")]
    public void TestApp_ProducesNoErrors(string name)
    {
        var app = AppConfigEngine.Open(new FileSystemAppDirectory(TestAppDir(name))).Build();
        AssertNoErrors(ValidationEngine.Run(app), name);
    }

    private static void AssertNoErrors(ValidationReport report, string app)
    {
        Assert.False(
            report.HasErrors(),
            $"{app} should not produce error-severity findings; got: {string.Join("\n", report.Findings.Where(f => f.Severity == Severity.Error).Select(f => f.ToString()))}"
        );
    }

    private static string TestAppDir(string name)
    {
        var dir = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(dir))
        {
            var candidate = Path.Combine(dir, "src", "test", "apps", name);
            if (Directory.Exists(candidate))
                return candidate;
            var parent = Directory.GetParent(dir)?.FullName;
            if (parent == dir || parent is null)
                break;
            dir = parent;
        }
        throw new InvalidOperationException($"could not locate src/test/apps/{name} from {AppContext.BaseDirectory}");
    }
}
