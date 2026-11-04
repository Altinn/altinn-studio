using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;
using static Studioctl.Tests.Upgrade.v8Tov9.PolicyXmlBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// The order of the upgrade's steps: the service-owner policy must be checked against the process the
/// eFormidling step leaves behind, because the task it inserts confirms the instance while it runs.
/// </summary>
public sealed class V8Tov9UpgradeServiceOwnerPolicyTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task Upgrade_WithLegacyEFormidling_GrantsCompleteBeyondTheEndEvent()
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
            "config/applicationmetadata.json",
            """
            {
              "id": "ttd/myapp",
              "org": "ttd",
              "eFormidling": {
                "receiver": "910075918",
                "sendAfterTaskId": "Task_1",
                "process": "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0",
                "standard": "urn:no:difi:arkivmelding:xsd::arkivmelding",
                "typeVersion": "2.0",
                "type": "arkivmelding",
                "securityLevel": 3,
                "dataTypes": ["model"]
              },
              "dataTypes": []
            }
            """
        );
        _app.Write(
            "appsettings.json",
            """
            { "AppSettings": { "EnableEFormidling": true } }
            """
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_end", "Task_1", "EndEvent_1")
            )
        );
        _app.Write(
            "config/authorization/policy.xml",
            Policy(
                Rule(
                    "1",
                    AnyOf(AllOf(SubjectOrg("ttd"))),
                    AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                    AnyOf(AllOf(Action("read")), AllOf(Action("write")))
                ),
                Rule(
                    "2",
                    AnyOf(AllOf(SubjectOrg("ttd"))),
                    AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"), ResourceEndEvent("EndEvent_1"))),
                    AnyOf(AllOf(Action("complete")))
                )
            )
        );

        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: new UpgradeReport(),
                Error: new StringWriter(),
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        Assert.Contains("EFormidlingTask_Task_1", _app.Read("config/process/process.bpmn"), StringComparison.Ordinal);
        string policy = _app.Read("config/authorization/policy.xml");
        Assert.Contains("gives the app owner ttd the right to complete instances", policy, StringComparison.Ordinal);
    }
}
