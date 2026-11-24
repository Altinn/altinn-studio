using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Checks that the upgrade runs the custom task type check. The csproj upgrade and semantic analysis are skipped so
/// the run stays offline and local.
/// </summary>
public sealed class V8Tov9UpgradeCustomTaskTypeTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task Upgrade_WarnsAboutACustomTaskType()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>
              <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
              <PackageReference Include="Altinn.App.Core" Version="9.0.0" />
            </ItemGroup></Project>
            """
        );
        _app.Write("config/process/process.bpmn", Process(Task("Task_1", "data"), Task("Task_Sftp", "sftp")));

        var report = new UpgradeReport();
        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: new StringWriter(),
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        var step = Assert.Single(report.Steps, step => step.Name == "Custom task types");
        var message = Assert.Single(step.Messages);
        Assert.Equal(UpgradeMessageStatus.Warning, message.Status);
        Assert.StartsWith(
            "The process uses the custom task type(s) 'sftp' (Task_Sftp).",
            message.Text,
            StringComparison.Ordinal
        );
    }
}
