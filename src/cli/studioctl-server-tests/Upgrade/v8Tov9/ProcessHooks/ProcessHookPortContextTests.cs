using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// What the port reads from the app's configuration: the process's tasks, the app id and the package versions.
/// </summary>
public sealed class ProcessHookPortContextTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    [Fact]
    public void ReadsTheTasksOfTheProcess_TheAppId_AndThePackageVersions()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.7.0" />
                <PackageReference Include="Dibk.Ftpb.Common.AltinnApps" Version="1.3.5-alpha" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(
            "config/process/process.bpmn",
            """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions">
              <bpmn:process id="Process">
                <bpmn:startEvent id="StartEvent" />
                <bpmn:task id="Task_1" />
                <bpmn:serviceTask id="Task_Pdf" />
                <bpmn:endEvent id="EndEvent" />
              </bpmn:process>
            </bpmn:definitions>
            """
        );
        _app.Write(
            "config/applicationmetadata.json",
            """
            { "id": "ssb/ra0850-01" }
            """
        );

        var context = ProcessHookPortContext.Read(AppFolder);

        Assert.Equal("ssb/ra0850-01", context.AppId);
        Assert.Equal(["Task_1", "Task_Pdf"], context.BpmnTaskIds.Order(StringComparer.Ordinal));
        Assert.Equal("1.3.5-alpha", context.PackageVersions["dibk.ftpb.common.altinnapps"]);
    }

    [Fact]
    public void WithoutTheConfiguration_NoTaskIsKnown_AndTheAppIsNamedByItsFolder()
    {
        _app.Write("App.csproj", "<Project />");

        var context = ProcessHookPortContext.Read(AppFolder);

        Assert.Equal("App", context.AppId);
        Assert.Empty(context.BpmnTaskIds);
        Assert.Empty(context.PackageVersions);
    }
}
