using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// What the port reads from the app's configuration: the process's tasks, the data types and the package versions.
/// </summary>
public sealed class ProcessHookPortContextTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    [Fact]
    public void ReadsTheTasksOfTheProcess_TheDataTypes_AndThePackageVersions()
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
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions">
              <bpmn:process id="Process">
                <bpmn:startEvent id="StartEvent" />
                <bpmn:task id="Task_1" />
                <bpmn:task id="Task_Receipt" />
                <bpmn:serviceTask id="Task_Pdf">
                  <bpmn:extensionElements>
                    <altinn:taskExtension><altinn:taskType>pdf</altinn:taskType></altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:serviceTask>
                <bpmn:endEvent id="EndEvent" />
              </bpmn:process>
            </bpmn:definitions>
            """
        );
        _app.Write(
            "config/applicationmetadata.json",
            """
            {
              "id": "ssb/ra0850-01",
              "dataTypes": [
                {
                  "id": "model",
                  "appLogic": { "autoCreate": true, "classRef": "Altinn.App.Models.Model" },
                  "taskId": "Task_1"
                },
                {
                  "id": "receipt",
                  "appLogic": { "classRef": "Altinn.App.Models.Receipt", "autoDeleteOnProcessEnd": true },
                  "taskId": "Task_1",
                  "taskIds": ["Task_1", "Task_Receipt"],
                  "enablePdfCreation": false
                },
                { "id": "ref-data-as-pdf" }
              ],
              "dataFields": [ { "id": "skjemaVersjon", "path": "InternInfo.skjemaVersjon", "dataTypeId": "model" } ],
              "presentationFields": [ { "id": "periodeFritekst", "path": "InternInfo.periode", "dataTypeId": "model" } ],
            }
            """
        );

        var context = ProcessHookPortContext.Read(AppFolder);

        Assert.Equal("ssb/ra0850-01", context.AppId);
        Assert.Equal(["Task_1", "Task_Pdf", "Task_Receipt"], context.BpmnTaskIds.Order(StringComparer.Ordinal));
        Assert.Equal(new Dictionary<string, string> { ["Task_Pdf"] = "pdf" }, context.BpmnTaskTypes);
        Assert.Equivalent(
            new DataTypeInfo(
                "model",
                "Altinn.App.Models.Model",
                ["Task_1"],
                ["skjemaVersjon"],
                ["periodeFritekst"],
                AutoCreate: true,
                EnablePdfCreation: true,
                AutoDeleteOnProcessEnd: false
            ),
            context.DataTypes["model"]
        );
        Assert.Equivalent(
            new DataTypeInfo(
                "receipt",
                "Altinn.App.Models.Receipt",
                ["Task_1", "Task_Receipt"],
                [],
                [],
                AutoCreate: false,
                EnablePdfCreation: false,
                AutoDeleteOnProcessEnd: true
            ),
            context.DataTypes["receipt"]
        );
        Assert.Equivalent(
            new DataTypeInfo("ref-data-as-pdf", null, [], [], [], false, true, false),
            context.DataTypes["ref-data-as-pdf"]
        );
        Assert.Equal("1.3.5-alpha", context.PackageVersions["dibk.ftpb.common.altinnapps"]);
    }

    [Fact]
    public void WithoutTheConfiguration_NoTaskIsKnown_AndTheAppIsNamedByItsFolder()
    {
        _app.Write("App.csproj", "<Project />");

        var context = ProcessHookPortContext.Read(AppFolder);

        Assert.Equal("App", context.AppId);
        Assert.Empty(context.BpmnTaskIds);
        Assert.Empty(context.DataTypes);
        Assert.Empty(context.PackageVersions);
    }
}
