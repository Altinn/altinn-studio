using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.StudioctlServer.Studioctl;
using Microsoft.Extensions.Logging.Abstractions;

namespace Studioctl.Tests;

public sealed class AppValidationServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(
        Path.GetTempPath(),
        "studioctl-validate-" + Guid.NewGuid().ToString("N")
    );

    private static AppValidationService Service() =>
        new(new AppDistSchemasService(NullLogger<AppDistSchemasService>.Instance, () => null));

    [Fact]
    public async Task MissingPath_IsInvalid()
    {
        var result = await Service().RunAsync("", null, TestContext.Current.CancellationToken);

        Assert.Equal(AppValidationResultKind.Invalid, result.Kind);
        Assert.Contains("path", result.Message);
    }

    [Fact]
    public async Task UnknownSeverity_IsInvalidBeforeTheAppIsRead()
    {
        var result = await Service().RunAsync(_root, "loud", TestContext.Current.CancellationToken);

        Assert.Equal(AppValidationResultKind.Invalid, result.Kind);
        Assert.Contains("loud", result.Message);
    }

    [Fact]
    public async Task MissingDirectory_IsInvalid()
    {
        var result = await Service().RunAsync(_root, null, TestContext.Current.CancellationToken);

        Assert.Equal(AppValidationResultKind.Invalid, result.Kind);
        Assert.Contains("does not exist", result.Message);
    }

    [Fact]
    public async Task App_IsValidatedAndFilteredBySeverity()
    {
        WriteApp();

        var result = await Service().RunAsync(_root, "error", TestContext.Current.CancellationToken);

        Assert.Equal(AppValidationResultKind.Completed, result.Kind);
        Assert.All(result.Findings, f => Assert.Equal(Severity.Error, f.Severity));
        var missingPage = Assert.Single(result.Findings, f => f.RuleId == "REF-PAGE-FILE");
        Assert.Equal("App/ui/Task_1/Settings.json", missingPage.File);
        Assert.False(result.SchemaValidation.Ran);
    }

    private void WriteApp()
    {
        Write(
            "App/App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup><PackageReference Include="Altinn.App.Api" Version="9.0.0" /></ItemGroup></Project>
            """
        );
        Write(
            "App/config/applicationmetadata.json",
            """
            {"id":"ttd/x","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"}]}
            """
        );
        Write("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1","Missing"]},"defaultDataType":"model"}""");
        Write("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}""");
    }

    private void Write(string relative, string content)
    {
        var path = Path.Combine(_root, relative);
        Directory.CreateDirectory(Path.Combine(_root, Path.GetDirectoryName(relative) ?? ""));
        File.WriteAllText(path, content);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
    }
}
