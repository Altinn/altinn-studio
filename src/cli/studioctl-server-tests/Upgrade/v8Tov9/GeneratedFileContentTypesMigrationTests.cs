using System.Text;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class GeneratedFileContentTypesMigrationTests : IDisposable
{
    private const string MetadataPath = "config/applicationmetadata.json";
    private const string ProcessPath = "config/process/process.bpmn";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> Migrate() => await GeneratedFileContentTypesMigration.Migrate(_app.Root);

    [Fact]
    public async Task AddsPdfToAPaymentReceiptTypeThatAllowsOnlyJson()
    {
        _app.Write(ProcessPath, Process(Task("Task_1", "data"), PaymentTask("Task_2", "paymentReceiptPdf-1234")));
        _app.Write(
            MetadataPath,
            """
            {
              "id": "ttd/app",
              "dataTypes": [
                {
                  "id": "paymentInformation-1234",
                  "allowedContentTypes": [
                    "application/json"
                  ],
                  "maxCount": 1
                },
                {
                  "id": "paymentReceiptPdf-1234",
                  "allowedContentTypes": [
                    "application/json"
                  ],
                  "maxCount": 1,
                  "taskId": "Task_2"
                }
              ]
            }
            """
        );

        var result = await Migrate();

        Assert.Equal(
            """
            {
              "id": "ttd/app",
              "dataTypes": [
                {
                  "id": "paymentInformation-1234",
                  "allowedContentTypes": [
                    "application/json"
                  ],
                  "maxCount": 1
                },
                {
                  "id": "paymentReceiptPdf-1234",
                  "allowedContentTypes": [
                    "application/json",
                    "application/pdf"
                  ],
                  "maxCount": 1,
                  "taskId": "Task_2"
                }
              ]
            }
            """,
            _app.Read(MetadataPath)
        );
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("application/pdf", warning);
        Assert.Contains("'paymentReceiptPdf-1234'", warning);
        Assert.Contains("payment task 'Task_2'", warning);
        Assert.False(result.RequiresManualFollowUp);
    }

    [Fact]
    public async Task IsIdempotent()
    {
        _app.Write(ProcessPath, Process(PaymentTask("Task_2", "receipt")));
        _app.Write(
            MetadataPath,
            """{ "dataTypes": [{ "id": "receipt", "allowedContentTypes": ["application/json"] }] }"""
        );

        await Migrate();
        var afterFirstRun = _app.Read(MetadataPath);
        var result = await Migrate();

        Assert.Equal(
            """{ "dataTypes": [{ "id": "receipt", "allowedContentTypes": ["application/json", "application/pdf"] }] }""",
            afterFirstRun
        );
        Assert.Equal(afterFirstRun, _app.Read(MetadataPath));
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task PreservesByteOrderMarkAndLineEndings()
    {
        _app.Write(ProcessPath, Process(PaymentTask("Task_2", "receipt")));
        var json = """
            {
              "dataTypes": [
                {
                  "id": "receipt",
                  "allowedContentTypes": [
                    "application/json"
                  ]
                }
              ]
            }
            """.Replace("\n", "\r\n");
        _app.WriteBytes(MetadataPath, [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(json)]);

        await Migrate();

        var after = _app.ReadBytes(MetadataPath);
        Assert.Equal(Encoding.UTF8.GetPreamble(), after[..3]);
        Assert.Equal(
            json.Replace("\"application/json\"", "\"application/json\",\r\n        \"application/pdf\""),
            Encoding.UTF8.GetString(after[3..])
        );
    }

    [Theory]
    [InlineData("\"allowedContentTypes\": []")]
    [InlineData("\"allowedContentTypes\": null")]
    [InlineData("\"maxCount\": 1")]
    public async Task LeavesAnEmptyOrMissingListAlone(string property)
    {
        _app.Write(ProcessPath, Process(PaymentTask("Task_2", "receipt")));
        var content = $$"""{ "dataTypes": [{ "id": "receipt", {{property}} }] }""";
        _app.Write(MetadataPath, content);

        var result = await Migrate();

        Assert.Equal(content, _app.Read(MetadataPath));
        Assert.Empty(result.Messages);
    }

    [Theory]
    [InlineData("[\"application/pdf\"]")]
    [InlineData("[\"application/json\", \"application/pdf\"]")]
    public async Task LeavesATypeThatAcceptsTheContentTypeUnchanged(string allowedContentTypes)
    {
        _app.Write(ProcessPath, Process(PaymentTask("Task_2", "receipt")));
        var content = $$"""{ "dataTypes": [{ "id": "receipt", "allowedContentTypes": {{allowedContentTypes}} }] }""";
        _app.Write(MetadataPath, content);

        var result = await Migrate();

        Assert.Equal(content, _app.Read(MetadataPath));
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task AddsPdfToTheSigningPdfType()
    {
        _app.Write(
            ProcessPath,
            Process(SigningTask("Task_3", "<altinn:signingPdfDataType>signingPdf</altinn:signingPdfDataType>"))
        );
        _app.Write(
            MetadataPath,
            """{ "dataTypes": [{ "id": "signingPdf", "allowedContentTypes": ["application/json"] }] }"""
        );

        var result = await Migrate();

        Assert.Equal(
            """{ "dataTypes": [{ "id": "signingPdf", "allowedContentTypes": ["application/json", "application/pdf"] }] }""",
            _app.Read(MetadataPath)
        );
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("'signingPdf'", warning);
        Assert.Contains("signing task 'Task_3'", warning);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AddsJsonToTheSigneeStatesTypeOnlyWithASigneeProvider(bool hasSigneeProvider)
    {
        var signeeProvider = hasSigneeProvider ? "<altinn:signeeProviderId>signees</altinn:signeeProviderId>" : "";
        _app.Write(
            ProcessPath,
            Process(
                SigningTask(
                    "Task_3",
                    $"<altinn:signeeStatesDataTypeId>signeeState</altinn:signeeStatesDataTypeId>{signeeProvider}"
                )
            )
        );
        var content = """{ "dataTypes": [{ "id": "signeeState", "allowedContentTypes": ["text/plain"] }] }""";
        _app.Write(MetadataPath, content);

        var result = await Migrate();

        if (hasSigneeProvider)
        {
            Assert.Equal(
                """{ "dataTypes": [{ "id": "signeeState", "allowedContentTypes": ["text/plain", "application/json"] }] }""",
                _app.Read(MetadataPath)
            );
            var warning = Assert.Single(result.Warnings);
            Assert.Contains("application/json", warning);
            Assert.Contains("'signeeState'", warning);
        }
        else
        {
            Assert.Equal(content, _app.Read(MetadataPath));
            Assert.Empty(result.Messages);
        }
    }

    [Theory]
    [InlineData("pdf")]
    [InlineData("subformPdf")]
    public async Task AddsPdfToRefDataAsPdfForAPdfServiceTask(string taskType)
    {
        _app.Write(ProcessPath, Process(Task("Task_1", "data"), ServiceTask("Task_Pdf", taskType)));
        _app.Write(
            MetadataPath,
            """{ "dataTypes": [{ "id": "ref-data-as-pdf", "allowedContentTypes": ["application/octet-stream"] }] }"""
        );

        var result = await Migrate();

        Assert.Equal(
            """{ "dataTypes": [{ "id": "ref-data-as-pdf", "allowedContentTypes": ["application/octet-stream", "application/pdf"] }] }""",
            _app.Read(MetadataPath)
        );
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("'ref-data-as-pdf'", warning);
        Assert.Contains("'Task_Pdf'", warning);
    }

    [Fact]
    public async Task LeavesRefDataAsPdfAloneWithoutAPdfServiceTask()
    {
        _app.Write(ProcessPath, Process(Task("Task_1", "data")));
        var content = """{ "dataTypes": [{ "id": "ref-data-as-pdf", "allowedContentTypes": ["application/json"] }] }""";
        _app.Write(MetadataPath, content);

        var result = await Migrate();

        Assert.Equal(content, _app.Read(MetadataPath));
        Assert.Empty(result.Messages);
    }

    [Theory]
    [InlineData("customPayment")]
    [InlineData("Payment")]
    [InlineData(" payment ")]
    public async Task IgnoresATaskTypeThatIsNotBuiltIn(string taskType)
    {
        _app.Write(ProcessPath, Process(PaymentTask("Task_2", "receipt", taskType)));
        var content = """{ "dataTypes": [{ "id": "receipt", "allowedContentTypes": ["application/json"] }] }""";
        _app.Write(MetadataPath, content);

        var result = await Migrate();

        Assert.Equal(content, _app.Read(MetadataPath));
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task ReadsBothFilesTheWayTheAppDoes()
    {
        // The app reads the first receipt element, and of duplicate JSON properties, matched case-insensitively,
        // the last.
        _app.Write(
            ProcessPath,
            Process(
                ConfiguredTask(
                    "Task_2",
                    "payment",
                    "<altinn:paymentConfig>"
                        + "<altinn:paymentReceiptPdfDataType>first</altinn:paymentReceiptPdfDataType>"
                        + "<altinn:paymentReceiptPdfDataType>second</altinn:paymentReceiptPdfDataType>"
                        + "</altinn:paymentConfig>"
                )
            )
        );
        _app.Write(
            MetadataPath,
            """
            {
              "dataTypes": [
                { "id": "first", "allowedContentTypes": ["application/pdf"], "AllowedContentTypes": ["text/plain"] },
                { "id": "second", "allowedContentTypes": ["text/plain"] }
              ]
            }
            """
        );

        var result = await Migrate();

        var after = _app.Read(MetadataPath);
        Assert.Contains(
            """{ "id": "first", "allowedContentTypes": ["application/pdf"], "AllowedContentTypes": ["text/plain", "application/pdf"] }""",
            after
        );
        Assert.Contains("""{ "id": "second", "allowedContentTypes": ["text/plain"] }""", after);
        using var _ = JsonDocument.Parse(after);
        Assert.Contains("'first'", Assert.Single(result.Warnings));
    }

    [Fact]
    public async Task ReportsATodoWhenTheProcessCannotBeRead()
    {
        _app.Write(ProcessPath, "<bpmn:definitions");
        var content = """{ "dataTypes": [{ "id": "receipt", "allowedContentTypes": ["application/json"] }] }""";
        _app.Write(MetadataPath, content);

        var result = await Migrate();

        Assert.Equal(content, _app.Read(MetadataPath));
        Assert.Contains(ProcessPath, Assert.Single(result.Todos));
    }

    private static string PaymentTask(string id, string receiptDataType, string taskType = "payment") =>
        ConfiguredTask(
            id,
            taskType,
            $"""
            <altinn:paymentConfig>
                      <altinn:paymentDataType>paymentInformation</altinn:paymentDataType>
                      <altinn:paymentReceiptPdfDataType>{receiptDataType}</altinn:paymentReceiptPdfDataType>
                    </altinn:paymentConfig>
            """
        );

    private static string SigningTask(string id, string signatureConfig) =>
        ConfiguredTask(
            id,
            "signing",
            "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType>"
                + $"{signatureConfig}</altinn:signatureConfig>"
        );

    /// <summary>A task whose task extension holds <paramref name="configuration"/> after its task type.</summary>
    private static string ConfiguredTask(string id, string taskType, string configuration) =>
        $"""
                <bpmn:task id="{id}" name="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>{taskType}</altinn:taskType>
                      {configuration}
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
            """;
}
