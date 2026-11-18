using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;
using Microsoft.CodeAnalysis;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// v8 made a task's PDF only when the instance had an element of one of its data types, so the PDF service task
/// is added only for a data type something creates. Task_2 is a signing task whose data type 'signing' has no
/// autoCreate; Task_1's 'model' is auto-created.
/// </summary>
public sealed class PdfServiceTaskDataElementCreationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private static readonly Lazy<MetadataReference> _coreStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            """
            namespace Altinn.App.Core.Models
            {
                public class Instance { }
                public class DataType { public string Id { get; set; } = ""; }
            }

            namespace Altinn.App.Core.Internal.Data
            {
                using System.Threading.Tasks;
                using Altinn.App.Core.Models;

                public interface IDataClient
                {
                    Task<object> InsertFormData(Instance instance, string dataTypeId, object dataToSerialize);
                    Task<object> InsertFormData<T>(T dataToSerialize, System.Guid instanceGuid, System.Type type, string org, string app, int instanceOwnerPartyId, string dataType);
                    Task<object> InsertBinaryData(string instanceId, string dataType, string contentType, string filename, System.IO.Stream stream, string generatedFromTask = null);
                }

                public interface IDataService
                {
                    Task<object> InsertJsonObject(object instanceIdentifier, string dataTypeId, object data);
                }
            }

            namespace Altinn.App.Core.Features
            {
                using Altinn.App.Core.Models;

                public interface IInstanceDataMutator
                {
                    object AddFormDataElement(string dataTypeId, object model);
                    object AddFormDataElement(DataType dataType, object model);
                    object AddBinaryDataElement(string dataTypeId, string contentType, string filename, System.ReadOnlyMemory<byte> bytes);
                }
            }
            """
        )
    );

    private const string Usings = """
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Internal.Data;
        using Altinn.App.Core.Models;

        """;

    private CSharpSourceScanner SemanticScanner() => SemanticScannerFactory.CreateScanner(AppFolder, _coreStub.Value);

    private CSharpSourceScanner SyntaxScanner() => new(AppFolder);

    private void WriteApp(params string[] extraDataTypes)
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata([
                FormDataType("model", "Task_1", enablePdfCreation: true),
                FormDataType("signing", "Task_2", enablePdfCreation: true, autoCreate: false),
                .. extraDataTypes,
            ])
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                Task("Task_2", "signing"),
                EndEvent("EndEvent_1"),
                Flow("Flow_1", "Task_1", "Task_2"),
                Flow("Flow_2", "Task_2", "EndEvent_1")
            )
        );
    }

    private async Task<MigrationResult> Migrate(CSharpSourceScanner? code = null) =>
        await new PdfServiceTaskMigrator(_app.Root, code ?? SyntaxScanner()).Migrate();

    private IReadOnlyList<string> PdfTasks()
    {
        var doc = XDocument.Parse(_app.Read("config/process/process.bpmn"));
        return
        [
            .. doc.Descendants()
                .Where(e => e.Name.LocalName == "serviceTask")
                .Select(e => e.Attribute("id")?.Value)
                .OfType<string>(),
        ];
    }

    private static string? Info(MigrationResult result) =>
        result.Messages.SingleOrDefault(m => m.Status == UpgradeMessageStatus.Info)?.Text;

    [Fact]
    public async Task NothingCreatesTheDataType_NoPdfTask_AndInfo()
    {
        WriteApp();

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1"], PdfTasks());
        Assert.Equal(
            "Skipped PDF service task insertion after task 'Task_2': v8 made its PDF only when the instance had a "
                + "'signing' element, and nothing in the app creates one.",
            Info(result)
        );
        Assert.Empty(result.Todos);
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task NothingCreatesTheDataType_SecondRun_ChangesNothing()
    {
        WriteApp();
        await Migrate();
        var process = _app.Read("config/process/process.bpmn");
        var metadata = _app.Read("config/applicationmetadata.json");

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(process, _app.Read("config/process/process.bpmn"));
        Assert.Equal(metadata, _app.Read("config/applicationmetadata.json"));
    }

    [Fact]
    public async Task OneOfTheTasksDataTypesIsCreated_GatewayInfersTheCreatedOne()
    {
        // The data type nothing creates comes first, so the gateway would otherwise be pinned to it.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(
                FormDataType("manual", "Task_1", enablePdfCreation: true, autoCreate: false),
                FormDataType("model", "Task_1", enablePdfCreation: true)
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                Gateway("Gateway_1"),
                Flow("Flow_1", "Task_1", "Gateway_1"),
                ConditionalFlow("Flow_yes", "Gateway_1", "EndEvent_1", "[\"equals\", [\"dataModel\", \"done\"], true]"),
                ConditionalFlow("Flow_no", "Gateway_1", "EndEvent_2", "[\"equals\", [\"dataModel\", \"done\"], false]"),
                EndEvent("EndEvent_1"),
                EndEvent("EndEvent_2")
            )
        );

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1"], PdfTasks());
        Assert.Null(Info(result));
        Assert.Contains(
            "<altinn:connectedDataTypeId>model</altinn:connectedDataTypeId>",
            _app.Read("config/process/process.bpmn"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task ShadowFieldsSavedToTheDataType_CreateIt()
    {
        WriteApp();
        _app.Write(
            "config/applicationmetadata.json",
            _app.Read("config/applicationmetadata.json")
                .Replace(
                    "\"autoCreate\": true,",
                    "\"autoCreate\": true, \"shadowFields\": { \"prefix\": \"SF_\", \"saveToDataType\": \"signing\" },",
                    StringComparison.Ordinal
                )
        );

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1", "PdfTask_Task_2"], PdfTasks());
        Assert.Null(Info(result));
    }

    [Theory]
    [InlineData("client.InsertFormData(instance, Signing, new object())")]
    [InlineData("client.InsertFormData(instance, nameof(signing), new object())")]
    [InlineData(
        "client.InsertFormData(new object(), System.Guid.Empty, typeof(object), \"ttd\", \"app\", 1, \"sign\" + \"ing\")"
    )]
    [InlineData("client.InsertBinaryData(\"1/2\", Signing, \"application/xml\", \"signing.xml\", null, \"Task_1\")")]
    [InlineData(
        "client.InsertBinaryData(dataType: Signing, contentType: \"application/xml\", filename: null, stream: null, instanceId: \"1/2\")"
    )]
    [InlineData("service.InsertJsonObject(null, Signing, new object())")]
    [InlineData("mutator.AddFormDataElement(Signing, new object())")]
    [InlineData("mutator.AddBinaryDataElement(Signing, \"application/pdf\", null, default)")]
    public async Task CodeCreatesTheDataTypeWithAConstant_KeepsThePdfTask(string call)
    {
        WriteApp();
        _app.Write(
            "logic/Creator.cs",
            Usings
                + $$"""
                public class Creator
                {
                    private const string Signing = "signing";
                    private object signing = new();

                    public object Create(IDataClient client, IDataService service, IInstanceDataMutator mutator, Instance instance) =>
                        {{call}};
                }
                """
        );

        var result = await Migrate(SemanticScanner());

        Assert.Equal(["PdfTask_Task_1", "PdfTask_Task_2"], PdfTasks());
        Assert.Null(Info(result));
        Assert.Empty(result.Todos);
    }

    [Theory]
    [InlineData("client.InsertFormData(instance, dataTypeId, new object())")]
    [InlineData("client.InsertFormData(instance, ReadOnlyId, new object())")]
    [InlineData("mutator.AddFormDataElement(new DataType { Id = \"signing\" }, new object())")]
    public async Task CodeCreatesADataTypeThatIsNotAConstant_KeepsThePdfTask_WithATodo(string call)
    {
        WriteApp();
        _app.Write(
            "logic/Creator.cs",
            Usings
                + $$"""
                public class Creator
                {
                    private static readonly string ReadOnlyId = "signing";

                    public object Create(IDataClient client, IInstanceDataMutator mutator, Instance instance, string dataTypeId) =>
                        {{call}};
                }
                """
        );

        var result = await Migrate(SemanticScanner());

        Assert.Equal(["PdfTask_Task_1", "PdfTask_Task_2"], PdfTasks());
        Assert.Null(Info(result));
        var todo = Assert.Single(result.Todos);
        Assert.Equal(
            "PDF service task 'PdfTask_Task_2' may be unwanted: v8 made the PDF of task 'Task_2' only when the "
                + "instance had a 'signing' element, and only the app's code may create one, where it creates data "
                + $"elements of a data type that is not a constant: logic{Path.DirectorySeparatorChar}Creator.cs:10. "
                + "If nothing creates one, remove the PDF service task from the process.",
            todo
        );
    }

    [Theory]
    [InlineData("client.InsertFormData(instance, \"model\", new object())")]
    [InlineData("new LocalClient().InsertFormData(instance, dataTypeId, new object())")]
    public async Task CodeCreatesOtherElementsOnly_NoPdfTask(string call)
    {
        // Another data type named with a constant, and the app's own method of the same name, which is not an
        // Altinn API.
        WriteApp();
        _app.Write(
            "logic/Creator.cs",
            Usings
                + $$"""
                public class LocalClient
                {
                    public object InsertFormData(Instance instance, string dataTypeId, object data) => data;
                }

                public class Creator
                {
                    public object Create(IDataClient client, Instance instance, string dataTypeId) => {{call}};
                }
                """
        );

        var result = await Migrate(SemanticScanner());

        Assert.Equal(["PdfTask_Task_1"], PdfTasks());
        Assert.NotNull(Info(result));
        Assert.Empty(result.Todos);
    }

    [Theory]
    [InlineData("client.InsertFormData(instance, dataTypeString: \"signing\", data)", "signing", false)]
    [InlineData("client.InsertBinaryData(dataType: \"signing\", instanceId: id)", "signing", false)]
    [InlineData("accessor.AddFormDataElement(\"signing\", data)", "signing", false)]
    [InlineData("accessor.AddBinaryDataElement(\"signing\", \"application/pdf\", null, bytes)", "signing", false)]
    [InlineData("service.InsertJsonObject(id, \"signing\", data)", "signing", false)]
    [InlineData("accessor.AddFormDataElement(Constants.Signing, data)", null, true)]
    // The overloads of InsertFormData and InsertBinaryData put the data type in different places.
    [InlineData("client.InsertFormData(instance, \"signing\", data)", null, true)]
    [InlineData("client.InsertBinaryData(id, \"signing\", \"application/pdf\", \"a.pdf\", stream)", null, true)]
    public void WithoutASemanticModel_OnlyALiteralInTheDataTypesPositionNamesIt(
        string call,
        string? dataType,
        bool unknown
    )
    {
        _app.Write("logic/Creator.cs", $$"""public class Creator { public void Create() { {{call}}; } }""");

        var creations = new DataElementCreationDetector(SyntaxScanner()).Detect();

        string[] expected = dataType is null ? [] : [dataType];
        Assert.Equal(expected, creations.DataTypes);
        Assert.Equal(unknown, creations.UnknownDataTypes.Count == 1);
    }

    [Fact]
    public async Task SubformInLayoutSets_CreatesItsLayoutSetsDataType()
    {
        WriteApp();
        WriteSubformLayouts();
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "sets": [
                { "id": "form", "dataType": "model", "tasks": ["Task_1"] },
                { "id": "signing-entries", "dataType": "signing", "type": "subform" }
              ]
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1", "PdfTask_Task_2"], PdfTasks());
        Assert.Null(Info(result));
    }

    [Fact]
    public async Task SubformAfterTheLayoutSetMigration_CreatesItsFoldersDataType()
    {
        WriteApp();
        WriteSubformLayouts();
        _app.Write("ui/signing-entries/Settings.json", """{ "defaultDataType": "signing" }""");

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1", "PdfTask_Task_2"], PdfTasks());
        Assert.Null(Info(result));
    }

    [Fact]
    public async Task SubformOfAnotherDataType_DoesNotCreateIt()
    {
        WriteApp();
        WriteSubformLayouts();
        _app.Write("ui/signing-entries/Settings.json", """{ "defaultDataType": "entries" }""");

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1"], PdfTasks());
        Assert.NotNull(Info(result));
    }

    [Fact]
    public async Task PaymentTaskCreatesItsPaymentDataType()
    {
        WriteApp();
        _app.Write(
            "config/process/process.bpmn",
            _app.Read("config/process/process.bpmn")
                .Replace(
                    "<altinn:taskType>signing</altinn:taskType>",
                    "<altinn:taskType>payment</altinn:taskType><altinn:paymentConfig><altinn:paymentDataType>signing</altinn:paymentDataType></altinn:paymentConfig>",
                    StringComparison.Ordinal
                )
        );

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1", "PdfTask_Task_2"], PdfTasks());
        Assert.Null(Info(result));
    }

    [Fact]
    public async Task AutoCreateInAnyCasing_CreatesIt()
    {
        // v8 reads applicationmetadata.json with Newtonsoft, which matches property names in any casing.
        WriteApp();
        _app.Write(
            "config/applicationmetadata.json",
            _app.Read("config/applicationmetadata.json")
                .Replace(
                    "\"classRef\": \"Altinn.App.Models.signing\"",
                    "\"AutoCreate\": true, \"classRef\": \"Altinn.App.Models.signing\"",
                    StringComparison.Ordinal
                )
        );

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1", "PdfTask_Task_2"], PdfTasks());
        Assert.Null(Info(result));
    }

    [Fact]
    public async Task SigningTaskConfiguration_DoesNotCreateIt()
    {
        // Only a payment task's paymentDataType counts; a signing task's data types hold files, not form data.
        WriteApp();
        _app.Write(
            "config/process/process.bpmn",
            _app.Read("config/process/process.bpmn")
                .Replace(
                    "<altinn:taskType>signing</altinn:taskType>",
                    "<altinn:taskType>signing</altinn:taskType><altinn:paymentConfig><altinn:paymentDataType>signing</altinn:paymentDataType></altinn:paymentConfig><altinn:signatureConfig><altinn:signatureDataType>signing</altinn:signatureDataType></altinn:signatureConfig>",
                    StringComparison.Ordinal
                )
        );

        var result = await Migrate();

        Assert.Equal(["PdfTask_Task_1"], PdfTasks());
        Assert.NotNull(Info(result));
    }

    private void WriteSubformLayouts()
    {
        _app.Write("ui/Task_1/Settings.json", """{ "pages": { "order": ["Page1"] }, "defaultDataType": "model" }""");
        _app.Write(
            "ui/Task_1/layouts/Page1.json",
            """{ "data": { "layout": [{ "id": "entries", "type": "Subform", "layoutSet": "signing-entries" }] } }"""
        );
        _app.Write("ui/signing-entries/layouts/Page1.json", """{ "data": { "layout": [] } }""");
    }
}
