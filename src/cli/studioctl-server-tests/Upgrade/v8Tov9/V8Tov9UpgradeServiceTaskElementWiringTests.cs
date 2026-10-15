using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Runs the whole upgrade on an app whose Fiks Arkiv task is a <c>bpmn:task</c>, to show that the steps reading
/// the process afterwards see it as a service task.
/// </summary>
public sealed class V8Tov9UpgradeServiceTaskElementWiringTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task LaterProcessStepsSeeTheChangedTaskAsAServiceTask()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("Start"),
                Task("Task_1", "data"),
                Task("Task_Arkiv", "fiksArkiv"),
                Task("Task_Wait", "feedback"),
                EndEvent("End"),
                Flow("f1", "Start", "Task_1"),
                Flow("f2", "Task_1", "Task_Arkiv"),
                Flow("f3", "Task_Arkiv", "Task_Wait"),
                Flow("f4", "Task_Wait", "End")
            )
        );

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

        string MessagesOf(string step) =>
            string.Join(
                Environment.NewLine,
                Assert.Single(report.Steps, s => s.Name == step).Messages.Select(message => message.Text)
            );

        Assert.Contains("'Task_Arkiv' (fiksArkiv)", MessagesOf("Service task elements"), StringComparison.Ordinal);
        Assert.Contains(
            "ks:fiks - Fiks: a fiksArkiv service task in config/process/process.bpmn",
            MessagesOf("Maskinporten settings and scopes"),
            StringComparison.Ordinal
        );
        Assert.Contains(
            "The Fiks Arkiv task 'Task_Arkiv' is not followed by an exclusive gateway",
            MessagesOf("Fiks Arkiv settings"),
            StringComparison.Ordinal
        );
        Assert.Contains(
            "The feedback task 'Task_Wait' follows the service task 'Task_Arkiv'",
            MessagesOf("Feedback tasks behind service tasks"),
            StringComparison.Ordinal
        );
        Assert.Contains("<bpmn:serviceTask id=\"Task_Arkiv\"", _app.Read("config/process/process.bpmn"));
    }
}
