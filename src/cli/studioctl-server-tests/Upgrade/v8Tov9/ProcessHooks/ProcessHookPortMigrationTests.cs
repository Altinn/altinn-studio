using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;
using Microsoft.CodeAnalysis.CSharp;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.ProcessHookStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>The step "Process hooks and Storage calls" in the upgrade, and what it leaves for the steps after it.</summary>
public sealed class ProcessHookPortMigrationTests : IDisposable
{
    private const string HookPath = "logic/Hook.cs";

    private static readonly string _hook = InApp(
        """
        public class Hook : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId != "Task_1") return;
                await Task.Delay(1);
            }
        }
        """
    );

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private void WriteProject() =>
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.12.7" />
                <PackageReference Include="Altinn.App.Core" Version="8.12.7" />
              </ItemGroup>
            </Project>
            """
        );

    private MigrationResult Migrate(CSharpSourceScanner scanner) =>
        new ProcessHookPortMigration(scanner, ProcessHookPortContext.Read(AppFolder)).Migrate(
            TestContext.Current.CancellationToken
        );

    /// <summary>The run is offline and has no compilation of the app, so the step says it ported nothing.</summary>
    [Fact]
    public async Task WithoutTheV8Compilation_TheStepSaysNothingWasPorted_RightAfterTheKnownScenarios()
    {
        WriteProject();
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

        var steps = report.Steps.Select(static step => step.Name).ToList();
        var step = Assert.Single(report.Steps, static step => step.Name == "Process hooks and Storage calls");
        Assert.Equal(
            [
                new UpgradeMessage(
                    "Not ported without the app's v8 compilation; the removed APIs are listed below",
                    UpgradeMessageStatus.Skip
                ),
            ],
            step.Messages
        );
        Assert.Contains("Known scenarios", steps);
        Assert.Equal(steps.IndexOf("Known scenarios") + 1, steps.IndexOf("Process hooks and Storage calls"));
        Assert.Equal(steps.IndexOf("Process hooks and Storage calls") + 1, steps.IndexOf("OpenAPI namespace"));
    }

    [Fact]
    public void WithoutSemanticModels_ChangesNothing()
    {
        _app.Write(HookPath, _hook);

        var result = Migrate(new CSharpSourceScanner(AppFolder));

        Assert.Empty(result.Messages);
        Assert.Equal(_hook, _app.Read(HookPath));
    }

    [Fact]
    public void RunningAgain_FindsNothing()
    {
        _app.Write(HookPath, _hook);
        _app.Write("Program.cs", Program("services.AddTransient<IProcessTaskEnd, Hook>();"));
        var scanner = SemanticScannerFactory.CreateScanner(AppFolder, V8);
        Assert.NotEmpty(Migrate(scanner).Messages);
        var hook = _app.Read(HookPath);
        var program = _app.Read("Program.cs");

        Assert.Empty(Migrate(scanner).Messages);
        Assert.Equal(hook, _app.Read(HookPath));
        Assert.Equal(program, _app.Read("Program.cs"));
    }

    [Fact]
    public async Task TheRemovedApiCheck_ListsOnlyTheHooksThatWereNotPorted()
    {
        WriteProject();
        _app.Write(HookPath, _hook);
        _app.Write(
            "logic/Storage.cs",
            InApp(
                """
                public class Storage(Altinn.App.Core.Internal.Instances.IInstanceClient instanceClient) : IProcessTaskEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        if (taskId != "Task_2") return;
                        await instanceClient.UpdateDataValues(instance, new() { ["Fagsystem"] = "hego" });
                    }
                }
                """
            )
        );
        _app.Write(
            "Program.cs",
            Program(
                "services.AddTransient<IProcessTaskEnd, Hook>();",
                "services.AddTransient<IProcessTaskEnd, Storage>();"
            )
        );
        var output = new StringWriter();
        using var outputScope = UpgradeConsole.Use(output, output);
        var scanner = SemanticScannerFactory.CreateScanner(AppFolder, V8);
        Migrate(scanner);

        await V8Tov9Upgrade.CheckRemovedCSharpApis(scanner, Path.Combine(AppFolder, "App.csproj"));

        // The removed-API check prints the scanner's paths, which have the OS's separator.
        var text = output.ToString().Replace('\\', '/');
        Assert.Contains("logic/Storage.cs:11: Storage : IProcessTaskEnd", text);
        Assert.Contains("Program.cs:12: IProcessTaskEnd", text);
        Assert.DoesNotContain("Hook : IProcessTaskEnd", text);
        Assert.DoesNotContain("Program.cs:11: IProcessTaskEnd", text);
    }

    /// <summary>The scanner's relative paths have the OS's separator; the reports read the same on every OS.</summary>
    [Fact]
    public void AReportAboutAFileInAFolder_ShowsThePathWithForwardSlashes()
    {
        var root = CSharpSyntaxTree
            .ParseText("public class Hook { }", cancellationToken: TestContext.Current.CancellationToken)
            .GetCompilationUnitRoot(TestContext.Current.CancellationToken);
        var file = new ScannedCSharpFile(
            new CSharpSourceScanner(AppFolder),
            Path.Combine(AppFolder, "logic", "Hook.cs"),
            "logic\\Hook.cs",
            root
        );

        var report = PortReport.Located(file, root.Members[0], UpgradeMessageStatus.Warning, "a report");

        Assert.Equal(("logic/Hook.cs", "logic/Hook.cs:1: a report"), (report.Path, report.Message.Text));
    }
}
