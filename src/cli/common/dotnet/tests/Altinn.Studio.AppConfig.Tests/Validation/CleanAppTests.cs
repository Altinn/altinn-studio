using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

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
    [InlineData("subform-test")]
    public void TestApp_ProducesNoErrors(string name)
    {
        var app = AppConfigEngine.Open(new FileSystemAppDirectory(TestAppDir(name))).Build();
        AssertNoErrors(ValidationEngine.Run(app), name);
    }

    [Fact]
    public void MultipleDataModels_ReceiptTextResourceBindingExpression_IsCollected()
    {
        var app = AppConfigEngine.Open(new FileSystemAppDirectory(TestAppDir("multiple-datamodels-test"))).Build();

        var reference = Assert.Single(
            app.Refs.DataModel,
            r =>
                r.Position.File == "App/ui/CustomReceipt/layouts/receipt.json"
                && r.Position.Pointer.Contains("/textResourceBindings/", StringComparison.Ordinal)
        );
        Assert.Equal("tekstfelt", reference.Value);
        Assert.Equal("modell2", reference.ExplicitDataType);
        Assert.Equal("text2", reference.OwningComponentId);
        Assert.Equal("/data/layout/1/textResourceBindings/title/2/1", reference.Position.Pointer);
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
        var dir = RepoFiles.Path("src", "test", "apps", name);
        return Directory.Exists(dir) ? dir : throw new InvalidOperationException($"missing test app {dir}");
    }
}
