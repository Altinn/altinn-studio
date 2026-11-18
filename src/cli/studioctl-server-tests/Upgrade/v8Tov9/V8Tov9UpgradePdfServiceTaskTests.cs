using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;
using static Studioctl.Tests.Upgrade.v8Tov9.PolicyXmlBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// End-to-end check of the PDF service task step's inputs and consumers: it reads the app's code and the layouts
/// the layout-set conversion moved to task folders, and the policy step after it finds a PDF task the step put on
/// the sign branch of a gateway. The csproj upgrade and semantic analysis are skipped so the run stays offline.
/// </summary>
public sealed class V8Tov9UpgradePdfServiceTaskTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task Upgrade_KeepsCreatedDataTypesPdfs_AndExtendsThePolicyToThePdfTaskOnTheSignBranch()
    {
        // Task_1's model is auto-created, Task_2's signing model is created by the app's code, Task_3's entry model
        // by a Subform in Task_1, and nothing creates Task_3's notes model.
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>
              <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
              <PackageReference Include="Altinn.App.Core" Version="9.0.0" />
            </ItemGroup></Project>
            """
        );
        _app.Write(
            "logic/SigningModelCreator.cs",
            """
            public class SigningModelCreator
            {
                public void Create(IInstanceDataMutator mutator) => mutator.AddFormDataElement("signing", new object());
            }
            """
        );
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(
                FormDataType("model", "Task_1", enablePdfCreation: true),
                FormDataType("signing", "Task_2", enablePdfCreation: true, autoCreate: false),
                FormDataType("entry", "Task_3", enablePdfCreation: true, autoCreate: false),
                FormDataType("notes", "Task_4", enablePdfCreation: true, autoCreate: false)
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                Task("Task_2", "signing", ["sign", "reject"]),
                Gateway("Gateway_1"),
                Task("Task_3", "data"),
                Task("Task_4", "data"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_1", "Task_1", "Task_2"),
                Flow("Flow_to_gw", "Task_2", "Gateway_1"),
                ConditionalFlow("Flow_sign", "Gateway_1", "Task_3", """["equals",["gatewayAction"],"sign"]"""),
                ConditionalFlow("Flow_reject", "Gateway_1", "Task_1", """["equals",["gatewayAction"],"reject"]"""),
                Flow("Flow_3", "Task_3", "Task_4"),
                Flow("Flow_4", "Task_4", "EndEvent_1")
            )
        );
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "sets": [
                { "id": "form", "dataType": "model", "tasks": ["Task_1"] },
                { "id": "signing", "dataType": "signing", "tasks": ["Task_2"] },
                { "id": "entries", "dataType": "entry", "type": "subform" },
                { "id": "notes", "dataType": "notes", "tasks": ["Task_3", "Task_4"] }
              ]
            }
            """
        );
        foreach (var set in new[] { "form", "signing", "entries", "notes" })
            _app.Write($"ui/{set}/Settings.json", """{ "pages": { "order": ["Page1"] } }""");
        _app.Write(
            "ui/form/layouts/Page1.json",
            """{ "data": { "layout": [{ "id": "entries", "type": "Subform", "layoutSet": "entries" }] } }"""
        );
        foreach (var set in new[] { "signing", "entries", "notes" })
            _app.Write($"ui/{set}/layouts/Page1.json", """{ "data": { "layout": [] } }""");
        _app.Write(
            "config/authorization/policy.xml",
            Policy(
                Rule(
                    "1",
                    AnyOf(AllOf(SubjectRole("REGNA"))),
                    AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"), ResourceTask("Task_2"))),
                    AnyOf(AllOf(Action("read")), AllOf(Action("write")))
                )
            )
        );

        var report = await Upgrade();

        var pdfStep = Assert.Single(report.Steps, step => step.Name == "PDF service tasks");
        Assert.DoesNotContain(pdfStep.Messages, message => message.Status == UpgradeMessageStatus.Todo);
        Assert.Equal(
            [
                "Skipped PDF service task insertion after task 'Task_4': v8 made its PDF only when the instance had a "
                    + "'notes' element, and nothing in the app creates one.",
                "Put PDF service task 'PdfTask_Task_2' on the sign branch of gateway 'Gateway_1', which routes on "
                    + "gatewayAction after signing task 'Task_2'. As in v8, signing makes the PDF and rejecting does not.",
            ],
            pdfStep
                .Messages.Where(message => message.Status == UpgradeMessageStatus.Info)
                .Select(message => message.Text)
        );

        var process = XDocument.Parse(_app.Read("config/process/process.bpmn"));
        var flows = process
            .Descendants()
            .Where(e => e.Name.LocalName == "sequenceFlow")
            .Select(e => $"{e.Attribute("sourceRef")?.Value} -> {e.Attribute("targetRef")?.Value}")
            .Order(StringComparer.Ordinal);
        Assert.Equal(
            [
                "Gateway_1 -> PdfTask_Task_2",
                "Gateway_1 -> Task_1",
                "PdfTask_Task_1 -> Task_2",
                "PdfTask_Task_2 -> Task_3",
                "PdfTask_Task_3 -> Task_4",
                "StartEvent_1 -> Task_1",
                "Task_1 -> PdfTask_Task_1",
                "Task_2 -> Gateway_1",
                "Task_3 -> PdfTask_Task_3",
                "Task_4 -> EndEvent_1",
            ],
            flows
        );

        var policyStep = Assert.Single(report.Steps, step => step.Name == "User access to inserted service tasks");
        Assert.Contains(
            policyStep.Messages,
            message => message.Text.Contains("read, write on PdfTask_Task_2", StringComparison.Ordinal)
        );
    }

    private async Task<UpgradeReport> Upgrade()
    {
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

        return report;
    }
}
