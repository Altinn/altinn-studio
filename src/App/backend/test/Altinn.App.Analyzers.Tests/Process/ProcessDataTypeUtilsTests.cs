using System.Collections.Immutable;
using Altinn.App.Analyzers.Process;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Process;

public class ProcessDataTypeUtilsTests
{
    private const string AppRoot = "/repo/App/";
    private const string ProcessPath = AppRoot + "config/process/process.bpmn";
    private const string MetadataPath = AppRoot + "config/applicationmetadata.json";

    private const string UnknownDataType = "ALTINNAPP1013";
    private const string PdfDataTypeMissing = "ALTINNAPP1014";
    private const string CannotHold = "ALTINNAPP1015";
    private const string NotAppOwned = "ALTINNAPP1016";
    private const string TaskNotFound = "ALTINNAPP1017";
    private const string Skipped = "ALTINNAPP1018";
    private const string GatewayUnknownDataType = "ALTINNAPP1019";

    private const string Model =
        """{ "id": "model", "appLogic": { "classRef": "App.Models.Model" }, "taskId": "Task_1" }""";
    private const string RefDataAsPdf = """{ "id": "ref-data-as-pdf", "allowedContentTypes": ["application/pdf"] }""";

    [Fact]
    public void A_Process_Whose_Data_Types_All_Fit_Is_Valid()
    {
        var process = Process(
            SigningTask(
                "Task_Sign",
                """
                <altinn:signatureConfig>
                  <altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign>
                  <altinn:signatureDataType>signatures</altinn:signatureDataType>
                  <altinn:uniqueFromSignaturesInDataTypes><altinn:dataType>signatures</altinn:dataType></altinn:uniqueFromSignaturesInDataTypes>
                  <altinn:signeeProviderId>founders</altinn:signeeProviderId>
                  <altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId>
                  <altinn:signingPdfDataType>signingPdf</altinn:signingPdfDataType>
                </altinn:signatureConfig>
                """
            ),
            Task(
                "Task_Pay",
                "payment",
                """
                <altinn:paymentConfig>
                  <altinn:paymentDataType>paymentInformation</altinn:paymentDataType>
                  <altinn:paymentReceiptPdfDataType>paymentReceipt</altinn:paymentReceiptPdfDataType>
                </altinn:paymentConfig>
                """
            ),
            Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"),
            Task(
                "Task_SubformPdf",
                "subformPdf",
                """
                <altinn:subformPdfConfig>
                  <altinn:subformComponentId>Subform</altinn:subformComponentId>
                  <altinn:subformDataTypeId>model</altinn:subformDataTypeId>
                </altinn:subformPdfConfig>
                """,
                element: "bpmn:serviceTask"
            ),
            Task(
                "Task_EFormidling",
                "eFormidling",
                """
                <altinn:eFormidlingConfig>
                  <altinn:dataTypes><altinn:dataType>model</altinn:dataType><altinn:dataType>ref-data-as-pdf</altinn:dataType></altinn:dataTypes>
                </altinn:eFormidlingConfig>
                """,
                element: "bpmn:serviceTask"
            ),
            Gateway("Gateway_1", "model")
        );
        var metadata = Metadata(
            Model,
            RefDataAsPdf,
            """{ "id": "signatures", "allowedContributors": ["app:owned"], "taskId": "Task_Sign" }""",
            """{ "id": "signeeStates", "allowedContentTypes": ["application/json"], "allowedContributors": ["app:owned"], "taskId": "Task_Sign" }""",
            """{ "id": "signingPdf", "allowedContentTypes": ["application/pdf"] }""",
            """{ "id": "paymentInformation", "allowedContributors": ["app:owned"], "taskId": "Task_Pay" }""",
            """{ "id": "paymentReceipt", "allowedContentTypes": ["application/pdf"] }"""
        );

        Assert.Empty(Collect(process, metadata));
    }

    [Theory]
    [InlineData(
        "signing",
        "<altinn:signatureConfig><altinn:signatureDataType>X</altinn:signatureDataType></altinn:signatureConfig>",
        "<altinn:signatureConfig><altinn:signatureDataType>",
        UnknownDataType
    )]
    // The sign action signs the listed data types it finds, and fails only when it finds none.
    [InlineData(
        "signing",
        "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType><altinn:dataType>X</altinn:dataType></altinn:dataTypesToSign></altinn:signatureConfig>",
        "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>",
        Skipped
    )]
    [InlineData(
        "signing",
        "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>X</altinn:dataType></altinn:dataTypesToSign></altinn:signatureConfig>",
        "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>",
        UnknownDataType
    )]
    [InlineData(
        "signing",
        "<altinn:signatureConfig><altinn:uniqueFromSignaturesInDataTypes><altinn:dataType>X</altinn:dataType></altinn:uniqueFromSignaturesInDataTypes></altinn:signatureConfig>",
        "<altinn:signatureConfig><altinn:uniqueFromSignaturesInDataTypes><altinn:dataType>",
        Skipped
    )]
    [InlineData(
        "signing",
        "<altinn:signatureConfig><altinn:signeeStatesDataTypeId>X</altinn:signeeStatesDataTypeId></altinn:signatureConfig>",
        "<altinn:signatureConfig><altinn:signeeStatesDataTypeId>",
        UnknownDataType
    )]
    [InlineData(
        "signing",
        "<altinn:signatureConfig><altinn:signingPdfDataType>X</altinn:signingPdfDataType></altinn:signatureConfig>",
        "<altinn:signatureConfig><altinn:signingPdfDataType>",
        UnknownDataType
    )]
    [InlineData(
        "payment",
        "<altinn:paymentConfig><altinn:paymentDataType>X</altinn:paymentDataType></altinn:paymentConfig>",
        "<altinn:paymentConfig><altinn:paymentDataType>",
        UnknownDataType
    )]
    [InlineData(
        "payment",
        "<altinn:paymentConfig><altinn:paymentReceiptPdfDataType>X</altinn:paymentReceiptPdfDataType></altinn:paymentConfig>",
        "<altinn:paymentConfig><altinn:paymentReceiptPdfDataType>",
        UnknownDataType
    )]
    // A subformPdf task's startup check fails on it; another task type finds no data elements of the type.
    [InlineData(
        "subformPdf",
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>X</altinn:subformDataTypeId></altinn:subformPdfConfig>",
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>",
        UnknownDataType
    )]
    [InlineData(
        "myTask",
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>X</altinn:subformDataTypeId></altinn:subformPdfConfig>",
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>",
        Skipped
    )]
    [InlineData(
        "eFormidling",
        "<altinn:eFormidlingConfig><altinn:dataTypes><altinn:dataType>X</altinn:dataType></altinn:dataTypes></altinn:eFormidlingConfig>",
        "<altinn:eFormidlingConfig><altinn:dataTypes><altinn:dataType>",
        UnknownDataType
    )]
    // The sign action and the app's own task types read the same configuration on any task, so the task's type does
    // not matter.
    [InlineData(
        "myTask",
        "<altinn:signatureConfig><altinn:signatureDataType>X</altinn:signatureDataType></altinn:signatureConfig>",
        "<altinn:signatureConfig><altinn:signatureDataType>",
        UnknownDataType
    )]
    public void An_Unknown_Data_Type_Is_Reported_On_The_Element_That_Names_It(
        string taskType,
        string config,
        string elementPath,
        string expectedId
    )
    {
        var process = Process(Task("Task_2", taskType, config));

        var diagnostic = Assert.Single(Collect(process, Metadata(Model, RefDataAsPdf)), d => d.Id == expectedId);

        var expectedSeverity = expectedId == Skipped ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error;
        Assert.Equal(expectedSeverity, diagnostic.Severity);
        Assert.Contains($"Task 'Task_2' names the data type 'X' in {elementPath}", diagnostic.GetMessage());
        var lastElement = elementPath.Substring(elementPath.LastIndexOf('<')).TrimEnd('>');
        Assert.Equal(lastElement, Text(process, diagnostic));
    }

    [Fact]
    public void Data_Types_To_Sign_Are_Matched_Ignoring_Case_But_Shown_Only_When_They_Match_Exactly()
    {
        // The sign action signs 'Model' as 'model', but the signing view does not list its documents.
        var process = Process(
            SigningTask(
                "Task_Sign",
                "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>Model</altinn:dataType><altinn:dataType>X</altinn:dataType></altinn:dataTypesToSign></altinn:signatureConfig>"
            )
        );

        var diagnostics = Collect(process, Metadata(Model));

        Assert.All(diagnostics, d => Assert.Equal(Skipped, d.Id));
        Assert.Equal(["'Model'", "'X'"], diagnostics.Select(d => QuotedDataType(d.GetMessage())));
        Assert.Contains("the data type's id is 'model'", diagnostics[0].GetMessage());
        Assert.Contains("Change it to 'model'", diagnostics[0].GetMessage());
        Assert.Contains("the sign action leaves it out of what the user signs", diagnostics[1].GetMessage());
    }

    [Theory]
    // A blank entry matches nothing, like an unknown one: it is left out, and fails only when nothing else is signed.
    [InlineData("signing", "<altinn:dataType>model</altinn:dataType><altinn:dataType />", Skipped)]
    [InlineData("myTask", "<altinn:dataType />", UnknownDataType)]
    // ALTINNAPP1020 reports a signing task that names nothing to sign.
    [InlineData("signing", "<altinn:dataType />", null)]
    public void A_Blank_Data_Type_To_Sign_Fails_Only_When_Nothing_Is_Signed(
        string taskType,
        string entries,
        string? expectedId
    )
    {
        var process = Process(
            Task(
                "Task_Sign",
                taskType,
                $"<altinn:signatureConfig><altinn:dataTypesToSign>{entries}</altinn:dataTypesToSign></altinn:signatureConfig>"
            )
        );

        var diagnostics = Collect(process, Metadata(Model));

        Assert.Equal(expectedId is null ? [] : [expectedId], diagnostics.Select(d => d.Id));
    }

    [Theory]
    [InlineData("<altinn:signatureDataType />")]
    [InlineData("<altinn:signeeStatesDataTypeId> </altinn:signeeStatesDataTypeId>")]
    public void A_Blank_Signing_Data_Type_In_A_Signing_Task_Is_Left_To_The_Missing_Setting_Rule(string setting)
    {
        // ALTINNAPP1020 reports it as an empty setting.
        var process = Process(
            SigningTask(
                "Task_Sign",
                $"<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign>{setting}</altinn:signatureConfig>"
            )
        );

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Fact]
    public void A_Blank_Data_Type_In_A_Task_Without_A_Type_Is_Reported()
    {
        // Only a blank id in a signing task is left to ALTINNAPP1020; a task without a type is not one.
        var process = Process(
            """
                    <bpmn:task id="Task_Untyped">
                      <bpmn:extensionElements>
                        <altinn:taskExtension>
                          <altinn:signatureConfig><altinn:signingPdfDataType /></altinn:signatureConfig>
                        </altinn:taskExtension>
                      </bpmn:extensionElements>
                    </bpmn:task>

            """
        );

        Assert.Equal(UnknownDataType, Assert.Single(Collect(process, Metadata(Model))).Id);
    }

    [Fact]
    public async Task An_Unknown_Signature_Data_Type_Is_An_Error()
    {
        var process = Process(
            SigningTask(
                "Task_Sign",
                "<altinn:signatureConfig><altinn:signatureDataType>signature</altinn:signatureDataType></altinn:signatureConfig>"
            )
        );

        var diagnostics = Collect(
            process,
            Metadata(Model, """{ "id": "signatures", "allowedContributors": ["app:owned"] }""")
        );

        Assert.Equal(UnknownDataType, Assert.Single(diagnostics).Id);
        await Verify(diagnostics);
    }

    [Fact]
    public void Data_Type_Ids_Are_Matched_Exactly()
    {
        var process = Process(
            Task(
                "Task_Send",
                "eFormidling",
                "<altinn:eFormidlingConfig><altinn:dataTypes><altinn:dataType>Model</altinn:dataType><altinn:dataType> model</altinn:dataType></altinn:dataTypes></altinn:eFormidlingConfig>",
                element: "bpmn:serviceTask"
            )
        );

        var diagnostics = Collect(process, Metadata(Model));

        Assert.Equal(["'Model'", "' model'"], diagnostics.Select(d => QuotedDataType(d.GetMessage())));
    }

    [Fact]
    public void Every_EFormidling_Data_Type_List_Is_Checked_Whatever_Its_Environment()
    {
        var process = Process(
            Task(
                "Task_Send",
                "eFormidling",
                """
                <altinn:eFormidlingConfig>
                  <altinn:dataTypes><altinn:dataType>model</altinn:dataType></altinn:dataTypes>
                  <altinn:dataTypes env="prod"><altinn:dataType>prodOnly</altinn:dataType></altinn:dataTypes>
                  <altinn:dataTypes env="tt03"><altinn:dataType>unrecognizedOnly</altinn:dataType></altinn:dataTypes>
                </altinn:eFormidlingConfig>
                """,
                element: "bpmn:serviceTask"
            )
        );

        var diagnostics = Collect(process, Metadata(Model));

        Assert.Equal(["'prodOnly'", "'unrecognizedOnly'"], diagnostics.Select(d => QuotedDataType(d.GetMessage())));
    }

    [Theory]
    [InlineData("modell", "the data type 'modell'")]
    // An empty id is not null, so it skips the fallback to the layout's data type like an unknown one.
    [InlineData("", "an empty data type id")]
    public void An_Unknown_Connected_Data_Type_On_An_Exclusive_Gateway_Is_A_Warning(
        string connectedDataTypeId,
        string described
    )
    {
        var process = Process(Gateway("Gateway_1", connectedDataTypeId));

        var diagnostic = Assert.Single(Collect(process, Metadata(Model)));

        Assert.Equal(GatewayUnknownDataType, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.StartsWith($"Exclusive gateway 'Gateway_1' names {described}", diagnostic.GetMessage());
        Assert.Equal("<altinn:connectedDataTypeId", Text(process, diagnostic));
    }

    [Theory]
    // The element is bound as nullable, so xsi:nil makes it null, and the gateway falls back to the layout's data type.
    [InlineData("""xsi:nil="true" """, false)]
    [InlineData("""xsi:nil=" 1 " """, false)]
    [InlineData("""xsi:nil="false" """, true)]
    [InlineData("""nil="true" """, true)]
    public void A_Nil_Connected_Data_Type_Is_Absent(string attribute, bool reported)
    {
        var process = Process(
            $"""
                <bpmn:exclusiveGateway id="Gateway_1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                  <bpmn:extensionElements>
                    <altinn:gatewayExtension><altinn:connectedDataTypeId {attribute}/></altinn:gatewayExtension>
                  </bpmn:extensionElements>
                </bpmn:exclusiveGateway>

            """
        );

        var diagnostics = Collect(process, Metadata(Model));

        Assert.Equal(reported ? [GatewayUnknownDataType] : [], diagnostics.Select(d => d.Id));
    }

    [Theory]
    [InlineData(
        "<bpmn:extensionElements><altinn:gatewayExtension><altinn:connectedDataTypeId>model</altinn:connectedDataTypeId><altinn:connectedDataTypeId>X</altinn:connectedDataTypeId></altinn:gatewayExtension></bpmn:extensionElements>"
    )]
    [InlineData(
        "<bpmn:extensionElements><altinn:gatewayExtension /><altinn:gatewayExtension><altinn:connectedDataTypeId>X</altinn:connectedDataTypeId></altinn:gatewayExtension></bpmn:extensionElements>"
    )]
    [InlineData(
        "<bpmn:extensionElements /><bpmn:extensionElements><altinn:gatewayExtension><altinn:connectedDataTypeId>X</altinn:connectedDataTypeId></altinn:gatewayExtension></bpmn:extensionElements>"
    )]
    public void Only_The_First_Connected_Data_Type_Is_Read(string extensionElements)
    {
        var process = Process($"""<bpmn:exclusiveGateway id="Gateway_1">{extensionElements}</bpmn:exclusiveGateway>""");

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Fact]
    public void A_Connected_Data_Type_On_Another_Gateway_Is_Ignored()
    {
        // The runtime reads the connected data type of exclusive gateways only.
        var process = Process(Gateway("Gateway_1", "unknown").Replace("bpmn:exclusiveGateway", "bpmn:parallelGateway"));

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Fact]
    public void A_Gateway_Extension_On_A_Task_Is_Ignored()
    {
        // The runtime deserializes it, but reads the connected data type of exclusive gateways only.
        var process = Process(
            """
                <bpmn:task id="Task_2">
                  <bpmn:extensionElements>
                    <altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension>
                    <altinn:gatewayExtension><altinn:connectedDataTypeId>unknown</altinn:connectedDataTypeId></altinn:gatewayExtension>
                  </bpmn:extensionElements>
                </bpmn:task>

            """
        );

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Theory]
    // Element names are case-sensitive.
    [InlineData(
        "<altinn:signatureConfig><altinn:SignatureDataType>X</altinn:SignatureDataType></altinn:signatureConfig>"
    )]
    // So are their namespaces.
    [InlineData("<signatureConfig><signatureDataType>X</signatureDataType></signatureConfig>")]
    // And only the configuration's own children are read.
    [InlineData(
        "<altinn:signatureConfig><altinn:other><altinn:signatureDataType>X</altinn:signatureDataType></altinn:other></altinn:signatureConfig>"
    )]
    public void Elements_The_Runtime_Does_Not_Read_As_A_Data_Type_Are_Ignored(string config)
    {
        var process = Process(Task("Task_2", "myTask", config));

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Theory]
    // The runtime checks these only for null, and then looks the empty id up and fails.
    [InlineData("<altinn:signatureConfig><altinn:signatureDataType /></altinn:signatureConfig>", UnknownDataType)]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType> </altinn:signatureDataType></altinn:signatureConfig>",
        UnknownDataType
    )]
    [InlineData("<altinn:signatureConfig><altinn:signeeStatesDataTypeId /></altinn:signatureConfig>", UnknownDataType)]
    [InlineData("<altinn:signatureConfig><altinn:signingPdfDataType /></altinn:signatureConfig>", UnknownDataType)]
    [InlineData(
        "<altinn:eFormidlingConfig><altinn:dataTypes><altinn:dataType /></altinn:dataTypes></altinn:eFormidlingConfig>",
        UnknownDataType
    )]
    // The runtime filters by these, so a blank entry matches nothing and is skipped, like an unknown one.
    [InlineData(
        "<altinn:signatureConfig><altinn:uniqueFromSignaturesInDataTypes><altinn:dataType /></altinn:uniqueFromSignaturesInDataTypes></altinn:signatureConfig>",
        Skipped
    )]
    // The runtime rejects these as missing itself.
    [InlineData("<altinn:paymentConfig><altinn:paymentDataType /></altinn:paymentConfig>", null)]
    [InlineData("<altinn:paymentConfig><altinn:paymentReceiptPdfDataType /></altinn:paymentConfig>", null)]
    [InlineData("<altinn:subformPdfConfig><altinn:subformDataTypeId /></altinn:subformPdfConfig>", null)]
    public void Blank_Data_Type_Ids_Are_Reported_Where_The_Runtime_Looks_Them_Up(string config, string? expectedId)
    {
        var process = Process(Task("Task_2", "myTask", config));

        var diagnostics = Collect(process, Metadata(Model));

        if (expectedId is null)
        {
            Assert.Empty(diagnostics);
            return;
        }

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(expectedId, diagnostic.Id);
        Assert.StartsWith("Task 'Task_2' names an empty data type id in", diagnostic.GetMessage());
    }

    [Theory]
    // A later occurrence of an element bound to a single value is ignored.
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>model</altinn:signatureDataType><altinn:signatureDataType>X</altinn:signatureDataType></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>model</altinn:signatureDataType></altinn:signatureConfig><altinn:signatureConfig><altinn:signatureDataType>X</altinn:signatureDataType></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig /><altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>X</altinn:dataType></altinn:dataTypesToSign></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:paymentConfig><altinn:paymentDataType>model</altinn:paymentDataType><altinn:paymentDataType>X</altinn:paymentDataType></altinn:paymentConfig>"
    )]
    [InlineData(
        "<altinn:paymentConfig /><altinn:paymentConfig><altinn:paymentReceiptPdfDataType>X</altinn:paymentReceiptPdfDataType></altinn:paymentConfig>"
    )]
    [InlineData(
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>model</altinn:subformDataTypeId><altinn:subformDataTypeId>X</altinn:subformDataTypeId></altinn:subformPdfConfig>"
    )]
    [InlineData(
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>model</altinn:subformDataTypeId></altinn:subformPdfConfig><altinn:subformPdfConfig><altinn:subformDataTypeId>X</altinn:subformDataTypeId></altinn:subformPdfConfig>"
    )]
    [InlineData(
        "<altinn:eFormidlingConfig /><altinn:eFormidlingConfig><altinn:dataTypes><altinn:dataType>X</altinn:dataType></altinn:dataTypes></altinn:eFormidlingConfig>"
    )]
    public void A_Later_Occurrence_Of_A_Single_Valued_Element_Is_Ignored(string config)
    {
        var process = Process(Task("Task_2", "subformPdf", config, element: "bpmn:serviceTask"));

        Assert.Empty(Collect(process, Metadata(Model, RefDataAsPdf)));
    }

    [Theory]
    [InlineData(
        """
            <bpmn:extensionElements>
              <altinn:taskExtension><altinn:taskType>myTask</altinn:taskType></altinn:taskExtension>
              <altinn:taskExtension><altinn:signatureConfig><altinn:signatureDataType>X</altinn:signatureDataType></altinn:signatureConfig></altinn:taskExtension>
            </bpmn:extensionElements>
            """
    )]
    [InlineData(
        """
            <bpmn:extensionElements />
            <bpmn:extensionElements>
              <altinn:taskExtension><altinn:signatureConfig><altinn:signatureDataType>X</altinn:signatureDataType></altinn:signatureConfig></altinn:taskExtension>
            </bpmn:extensionElements>
            """
    )]
    public void Only_The_First_Task_Extension_Is_Read(string extensionElements)
    {
        var process = Process($"""<bpmn:task id="Task_2">{extensionElements}</bpmn:task>""");

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Theory]
    // XmlSerializer joins the items of a list wrapper that repeats.
    [InlineData(
        "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign><altinn:dataTypesToSign><altinn:dataType>X</altinn:dataType></altinn:dataTypesToSign></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:uniqueFromSignaturesInDataTypes><altinn:dataType>model</altinn:dataType></altinn:uniqueFromSignaturesInDataTypes><altinn:uniqueFromSignaturesInDataTypes><altinn:dataType>X</altinn:dataType></altinn:uniqueFromSignaturesInDataTypes></altinn:signatureConfig>"
    )]
    public void Every_Occurrence_Of_A_List_Is_Read(string config)
    {
        var process = Process(Task("Task_2", "myTask", config));

        var diagnostic = Assert.Single(Collect(process, Metadata(Model)));

        Assert.Equal(Skipped, diagnostic.Id);
        Assert.Equal("'X'", QuotedDataType(diagnostic.GetMessage()));
    }

    [Theory]
    [InlineData("pdf", "bpmn:serviceTask", "", "every time the task runs")]
    // A subformPdf task stores a PDF for each subform of its data type.
    [InlineData(
        "subformPdf",
        "bpmn:serviceTask",
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>model</altinn:subformDataTypeId></altinn:subformPdfConfig>",
        "whenever an instance has a subform to print"
    )]
    // ALTINNAPP1003 reports the element; checking the data type as well means changing it uncovers nothing new.
    [InlineData("pdf", "bpmn:task", "", "every time the task runs")]
    public void A_Pdf_Task_Needs_The_Ref_Data_As_Pdf_Data_Type(
        string taskType,
        string element,
        string config,
        string when
    )
    {
        var process = Process(Task("Task_Pdf", taskType, config, element: element));

        var diagnostic = Assert.Single(Collect(process, Metadata(Model)));

        Assert.Equal(PdfDataTypeMissing, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Contains($"Task 'Task_Pdf' of type '{taskType}'", diagnostic.GetMessage());
        Assert.Contains($"so storing them fails {when}.", diagnostic.GetMessage());
        Assert.Equal($"<{element}", Text(process, diagnostic));
    }

    [Theory]
    // Without a subform data type the app declares, the task stores no PDFs; ALTINNAPP1013 reports the unknown id,
    // and its startup check fails on a missing or blank one.
    [InlineData("")]
    [InlineData("<altinn:subformPdfConfig><altinn:subformDataTypeId /></altinn:subformPdfConfig>")]
    [InlineData(
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>X</altinn:subformDataTypeId></altinn:subformPdfConfig>"
    )]
    public void A_Subform_Pdf_Task_Without_A_Known_Subform_Data_Type_Does_Not_Need_The_Ref_Data_As_Pdf_Data_Type(
        string config
    )
    {
        var process = Process(Task("Task_Pdf", "subformPdf", config, element: "bpmn:serviceTask"));

        var unfit = """{ "id": "ref-data-as-pdf", "allowedContentTypes": ["image/png"] }""";

        Assert.DoesNotContain(Collect(process, Metadata(Model)), d => d.Id == PdfDataTypeMissing);
        Assert.DoesNotContain(Collect(process, Metadata(Model, unfit)), d => d.Id == CannotHold);
    }

    [Fact]
    public void A_Subform_Pdf_Task_Fails_To_Store_Only_When_An_Instance_Has_A_Subform_To_Print()
    {
        var process = Process(
            Task(
                "Task_Pdf",
                "subformPdf",
                "<altinn:subformPdfConfig><altinn:subformDataTypeId>model</altinn:subformDataTypeId></altinn:subformPdfConfig>",
                element: "bpmn:serviceTask"
            )
        );
        var dataType = """{ "id": "ref-data-as-pdf", "allowedContentTypes": ["image/png"] }""";

        var diagnostic = Assert.Single(Collect(process, Metadata(Model, dataType)));

        Assert.Equal(CannotHold, diagnostic.Id);
        Assert.Contains("so storing fails whenever an instance has a subform to print.", diagnostic.GetMessage());
    }

    [Theory]
    // Task types are matched exactly, like the runtime, and the app's own types store what they like.
    [InlineData("Pdf")]
    [InlineData(" pdf")]
    [InlineData("pdfIfRequested")]
    public void Other_Task_Types_Do_Not_Need_The_Ref_Data_As_Pdf_Data_Type(string taskType)
    {
        var process = Process(Task("Task_Pdf", taskType, element: "bpmn:serviceTask"));

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Theory]
    [InlineData("""{ "id": "ref-data-as-pdf" }""", null)]
    [InlineData("""{ "id": "ref-data-as-pdf", "allowedContentTypes": [] }""", null)]
    [InlineData("""{ "id": "ref-data-as-pdf", "allowedContentTypes": null }""", null)]
    [InlineData("""{ "id": "ref-data-as-pdf", "appLogic": { "classRef": null } }""", null)]
    [InlineData("""{ "id": "ref-data-as-pdf", "appLogic": {} }""", null)]
    [InlineData("""{ "id": "ref-data-as-pdf", "allowedContentTypes": ["image/png", "application/pdf"] }""", null)]
    [InlineData("""{ "id": "ref-data-as-pdf", "appLogic": { "classRef": "App.Models.Pdf" } }""", "appLogic.classRef")]
    // AddBinaryDataElement rejects any classRef that is not null.
    [InlineData("""{ "id": "ref-data-as-pdf", "appLogic": { "classRef": "" } }""", "appLogic.classRef")]
    [InlineData("""{ "id": "ref-data-as-pdf", "allowedContentTypes": ["image/png"] }""", "allowedContentTypes")]
    // The content type is matched exactly.
    [InlineData("""{ "id": "ref-data-as-pdf", "allowedContentTypes": ["application/PDF"] }""", "allowedContentTypes")]
    [InlineData("""{ "id": "ref-data-as-pdf", "allowedContentTypes": [null] }""", "allowedContentTypes")]
    public void The_Ref_Data_As_Pdf_Data_Type_Must_Hold_Pdf_Files(string dataType, string? expectedReason)
    {
        var process = Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"));

        var diagnostics = Collect(process, Metadata(Model, dataType));

        if (expectedReason is null)
        {
            Assert.Empty(diagnostics);
            return;
        }

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(CannotHold, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Contains(
            "Task 'Task_Pdf' stores the PDFs it generates as 'application/pdf' in the data type 'ref-data-as-pdf'",
            diagnostic.GetMessage()
        );
        Assert.Contains(expectedReason, diagnostic.GetMessage());
        Assert.Equal("<bpmn:serviceTask", Text(process, diagnostic));
    }

    [Fact]
    public void A_Class_Ref_Is_Reported_Before_The_Content_Types_Like_The_Runtime_Checks_Them()
    {
        var process = Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"));
        var dataType =
            """{ "id": "ref-data-as-pdf", "appLogic": { "classRef": "X" }, "allowedContentTypes": ["image/png"] }""";

        var diagnostic = Assert.Single(Collect(process, Metadata(Model, dataType)));

        Assert.Contains("appLogic.classRef", diagnostic.GetMessage());
        Assert.DoesNotContain("allowedContentTypes", diagnostic.GetMessage());
    }

    [Fact]
    public void The_Signee_States_Data_Type_Must_Hold_Json_When_A_Signee_Provider_Stores_Them()
    {
        var withProvider = Process(
            SigningTask(
                "Task_Sign",
                "<altinn:signatureConfig><altinn:signeeProviderId>p</altinn:signeeProviderId><altinn:signeeStatesDataTypeId>states</altinn:signeeStatesDataTypeId></altinn:signatureConfig>"
            )
        );
        var withoutProvider = withProvider.Replace("<altinn:signeeProviderId>p</altinn:signeeProviderId>", "");
        var withEmptyProvider = withProvider.Replace(
            "<altinn:signeeProviderId>p</altinn:signeeProviderId>",
            "<altinn:signeeProviderId />"
        );
        var metadata = Metadata(
            Model,
            """{ "id": "states", "allowedContentTypes": ["application/pdf"], "allowedContributors": ["app:owned"] }"""
        );

        var diagnostic = Assert.Single(Collect(withProvider, metadata));
        Assert.Equal(CannotHold, diagnostic.Id);
        Assert.Contains(
            "stores its signee states as 'application/json' in the data type 'states'",
            diagnostic.GetMessage()
        );
        Assert.Equal("<altinn:signeeStatesDataTypeId", Text(withProvider, diagnostic));

        // The runtime checks the provider only for null, so an empty one counts as configured.
        Assert.Equal(CannotHold, Assert.Single(Collect(withEmptyProvider, metadata)).Id);

        // Without a provider the runtime stores no signee states, and its startup check reports the missing pair.
        Assert.Empty(Collect(withoutProvider, metadata));
    }

    [Theory]
    [InlineData(
        "signing",
        "<altinn:signatureConfig><altinn:signingPdfDataType>pdfType</altinn:signingPdfDataType></altinn:signatureConfig>",
        "its signing PDF"
    )]
    [InlineData(
        "payment",
        "<altinn:paymentConfig><altinn:paymentReceiptPdfDataType>pdfType</altinn:paymentReceiptPdfDataType></altinn:paymentConfig>",
        "the payment receipt"
    )]
    public void Generated_Pdfs_Need_A_Data_Type_That_Holds_Pdf_Files(string taskType, string config, string what)
    {
        var process = Process(Task("Task_2", taskType, config));
        var metadata = Metadata(Model, """{ "id": "pdfType", "appLogic": { "classRef": "App.Models.Model" } }""");

        var diagnostic = Assert.Single(Collect(process, metadata));

        Assert.Equal(CannotHold, diagnostic.Id);
        Assert.Contains(
            $"Task 'Task_2' stores {what} as 'application/pdf' in the data type 'pdfType'",
            diagnostic.GetMessage()
        );
    }

    [Fact]
    public void Data_Types_A_Task_Of_Another_Type_Names_Are_Not_Checked_For_What_They_Hold()
    {
        // Only the built-in signing task stores a signing PDF; the app's own task type may do anything with it.
        var process = Process(
            Task(
                "Task_2",
                "myTask",
                "<altinn:signatureConfig><altinn:signingPdfDataType>model</altinn:signingPdfDataType><altinn:signatureDataType>model</altinn:signatureDataType></altinn:signatureConfig>"
            )
        );

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("Task_Sign", true)]
    [InlineData("Task_1", false)]
    [InlineData("task_sign", false)]
    public void Storage_Accepts_Signatures_Only_In_A_Data_Type_Of_The_Signing_Task(string? taskId, bool valid)
    {
        var process = Process(
            SigningTask(
                "Task_Sign",
                "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType></altinn:signatureConfig>"
            )
        );
        var taskIdJson = taskId is null ? "" : $""", "taskId": "{taskId}" """;
        var metadata = Metadata(
            Model,
            $$"""{ "id": "signatures", "allowedContributors": ["app:owned"]{{taskIdJson}} }"""
        );

        // A taskId that names no task, an empty one included, is reported by ALTINNAPP1017 as well.
        var diagnostics = Collect(process, metadata).Where(d => d.Id != TaskNotFound).ToList();

        if (valid)
        {
            Assert.Empty(diagnostics);
            return;
        }

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(CannotHold, diagnostic.Id);
        Assert.Contains($"the data type's taskId is '{taskId}'", diagnostic.GetMessage());
        Assert.Contains("Set its taskId to 'Task_Sign'", diagnostic.GetMessage());
    }

    [Theory]
    // Storage accepts the signature when any data type with the id fits, not only the first.
    [InlineData("Task_1", null, true)]
    [InlineData("Task_1", "Task_Sign", true)]
    [InlineData("Task_Sign", "Task_1", true)]
    [InlineData("Task_1", "Task_2", false)]
    public void Storage_Accepts_Signatures_In_Any_Data_Type_With_The_Id_That_Fits(
        string firstTaskId,
        string? secondTaskId,
        bool valid
    )
    {
        var process = Process(
            SigningTask(
                "Task_Sign",
                "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType></altinn:signatureConfig>"
            )
        );
        var secondTaskIdJson = secondTaskId is null ? "" : $""", "taskId": "{secondTaskId}" """;
        var metadata = Metadata(
            Model,
            $$"""{ "id": "signatures", "allowedContributors": ["app:owned"], "taskId": "{{firstTaskId}}" }""",
            $$"""{ "id": "signatures", "allowedContributors": ["app:owned"]{{secondTaskIdJson}} }"""
        );

        var diagnostics = Collect(process, metadata).Where(d => d.Id != TaskNotFound).ToList();

        Assert.Equal(valid ? [] : [CannotHold], diagnostics.Select(d => d.Id));
    }

    [Theory]
    [InlineData("""["app:owned"]""", null, true)]
    [InlineData(null, null, false)]
    [InlineData("[]", null, false)]
    [InlineData("""["app:owned", "org:ttd"]""", null, false)]
    [InlineData("""["App:Owned"]""", null, false)]
    [InlineData("""["org:ttd"]""", null, false)]
    // The obsolete spelling is read first, and wins when it lists anything.
    [InlineData(null, """["app:owned"]""", true)]
    [InlineData("""["app:owned"]""", "[]", true)]
    [InlineData("""["app:owned"]""", """["org:ttd"]""", false)]
    [InlineData("""["org:ttd"]""", """["app:owned"]""", true)]
    public void Signature_Signee_State_And_Payment_Data_Types_Must_Be_App_Owned(
        string? allowedContributors,
        string? allowedContributers,
        bool appOwned
    )
    {
        var process = Process(
            SigningTask(
                "Task_Sign",
                """
                <altinn:signatureConfig>
                  <altinn:signatureDataType>owned</altinn:signatureDataType>
                  <altinn:signeeStatesDataTypeId>owned</altinn:signeeStatesDataTypeId>
                </altinn:signatureConfig>
                """
            ),
            Task(
                "Task_Pay",
                "payment",
                "<altinn:paymentConfig><altinn:paymentDataType>owned</altinn:paymentDataType></altinn:paymentConfig>"
            )
        );
        var contributors = allowedContributors is null ? "" : $""", "allowedContributors": {allowedContributors}""";
        var contributers = allowedContributers is null ? "" : $""", "allowedContributers": {allowedContributers}""";
        var metadata = Metadata(Model, $$"""{ "id": "owned"{{contributors}}{{contributers}} }""");

        var diagnostics = Collect(process, metadata);

        if (appOwned)
        {
            Assert.Empty(diagnostics);
            return;
        }

        Assert.Equal(
            [
                "Task 'Task_Sign' keeps its signatures in the data type 'owned'",
                "Task 'Task_Sign' keeps its signee states in the data type 'owned'",
                "Task 'Task_Pay' keeps its payment information in the data type 'owned'",
            ],
            diagnostics.Select(d => d.GetMessage().Substring(0, d.GetMessage().IndexOf(',')))
        );
        Assert.All(diagnostics, d => Assert.Equal(NotAppOwned, d.Id));
        Assert.All(diagnostics, d => Assert.Equal(DiagnosticSeverity.Warning, d.Severity));
        // Who else may write depends on the list, so the message does not claim that users can.
        Assert.All(
            diagnostics,
            d => Assert.Contains("parties other than the app may be able to change that data", d.GetMessage())
        );
    }

    [Fact]
    public void Data_Types_That_Need_Not_Be_App_Owned_Are_Not_Reported()
    {
        // The signing PDF and the payment receipt are not checked by the runtime, and neither is a signature data type
        // that a task of another type names.
        var process = Process(
            SigningTask(
                "Task_Sign",
                "<altinn:signatureConfig><altinn:signatureDataType>owned</altinn:signatureDataType><altinn:signingPdfDataType>free</altinn:signingPdfDataType></altinn:signatureConfig>"
            ),
            Task(
                "Task_Pay",
                "payment",
                "<altinn:paymentConfig><altinn:paymentReceiptPdfDataType>free</altinn:paymentReceiptPdfDataType></altinn:paymentConfig>"
            ),
            Task(
                "Task_3",
                "myTask",
                "<altinn:signatureConfig><altinn:signatureDataType>free</altinn:signatureDataType></altinn:signatureConfig>"
            )
        );
        var metadata = Metadata(
            Model,
            """{ "id": "owned", "allowedContributors": ["app:owned"] }""",
            """{ "id": "free" }"""
        );

        Assert.Empty(Collect(process, metadata));
    }

    [Fact]
    public void A_Data_Type_For_A_Task_That_Does_Not_Exist_Is_Reported_On_Its_Task_Id()
    {
        var metadata = Metadata(Model, """{ "id": "attachments", "taskId": "Task_2" }""");

        var diagnostic = Assert.Single(Collect(Process(), metadata));

        Assert.Equal(TaskNotFound, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.StartsWith(
            "Data type 'attachments' has the taskId 'Task_2', but process.bpmn has no task with that id.",
            diagnostic.GetMessage()
        );
        Assert.Equal(MetadataPath, diagnostic.Location.GetLineSpan().Path);
        Assert.Equal(
            "\"Task_2\"",
            metadata.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length)
        );
    }

    [Theory]
    [InlineData("Gateway_1", "<bpmn:exclusiveGateway>")]
    [InlineData("EndEvent_1", "<bpmn:endEvent>")]
    [InlineData("StartEvent_1", "<bpmn:startEvent>")]
    public void A_Task_Id_That_Names_Another_Element_Says_What_It_Names(string taskId, string element)
    {
        var metadata = Metadata(Model, $$"""{ "id": "attachments", "taskId": "{{taskId}}" }""");

        var diagnostic = Assert.Single(Collect(Process(Gateway("Gateway_1", "model")), metadata));

        Assert.Equal(TaskNotFound, diagnostic.Id);
        Assert.Contains($"'{taskId}' is a {element} in process.bpmn, not a task", diagnostic.GetMessage());
    }

    [Fact]
    public void Task_Ids_Of_Tasks_And_Service_Tasks_Are_Valid()
    {
        var process = Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"));
        var metadata = Metadata(
            Model,
            """{ "id": "ref-data-as-pdf", "allowedContentTypes": ["application/pdf"], "taskId": "Task_Pdf" }""",
            """{ "id": "nullTask", "taskId": null }"""
        );

        Assert.Empty(Collect(process, metadata));
    }

    [Fact]
    public void An_Empty_Task_Id_Is_A_Task_Id_No_Task_Has()
    {
        // The app compares the taskId with the current task exactly, so the data type belongs to no task.
        var metadata = Metadata(Model, """{ "id": "attachments", "taskId": "" }""");

        var diagnostic = Assert.Single(Collect(Process(), metadata));

        Assert.Equal(TaskNotFound, diagnostic.Id);
        Assert.StartsWith(
            "Data type 'attachments' has the taskId '', but no task has an empty id.",
            diagnostic.GetMessage()
        );
        Assert.Equal(
            "\"\"",
            metadata.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length)
        );
    }

    [Fact]
    public void A_Task_Id_That_Names_A_Task_In_A_Sub_Process_Says_So()
    {
        var process = Process(
            """
                <bpmn:subProcess id="Sub_1">
                  <bpmn:task id="Task_Sub" />
                </bpmn:subProcess>

            """
        );
        var metadata = Metadata(Model, """{ "id": "attachments", "taskId": "Task_Sub" }""");

        var diagnostic = Assert.Single(Collect(process, metadata));

        Assert.Equal(TaskNotFound, diagnostic.Id);
        Assert.Contains(
            "'Task_Sub' is a <bpmn:task> inside a <bpmn:subProcess> in process.bpmn, which the app does not run",
            diagnostic.GetMessage()
        );
    }

    [Theory]
    // A stateless app finds the data model of the folder it shows by a taskId that names the folder.
    [InlineData("stateless", true, false)]
    [InlineData("stateless", false, true)]
    [InlineData("new-instance", true, true)]
    [InlineData("select-instance", true, true)]
    [InlineData(null, true, true)]
    public void A_Stateless_Data_Model_May_Name_The_Folder_The_App_Shows(string? show, bool hasClassRef, bool reported)
    {
        var onEntry = show is null ? "" : $$"""{ "show": "{{show}}" }""";
        var appLogic = hasClassRef ? """, "appLogic": { "classRef": "App.Models.Stateless" }""" : "";
        var metadata = $$"""
            {
              "onEntry": {{(show is null ? "null" : onEntry)}},
              "dataTypes": [
                {{Model}},
                { "id": "statelessModel", "taskId": "stateless"{{appLogic}} }
              ]
            }
            """;

        var diagnostics = Collect(Process(), metadata);

        Assert.Equal(reported ? [TaskNotFound] : [], diagnostics.Select(d => d.Id));
    }

    [Fact]
    public void The_Last_Task_Id_Property_Is_The_One_The_Runtime_Reads()
    {
        // System.Text.Json keeps the last of two properties whose names differ only in case.
        var metadata = Metadata(Model, """{ "id": "attachments", "taskId": "Task_1", "TaskId": "Task_Gone" }""");

        var diagnostic = Assert.Single(Collect(Process(), metadata));

        Assert.Equal(TaskNotFound, diagnostic.Id);
        Assert.Equal(
            "\"Task_Gone\"",
            metadata.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length)
        );
    }

    [Fact]
    public void Property_Names_In_Applicationmetadata_Are_Matched_Ignoring_Case()
    {
        // System.Text.Json reads the file with PropertyNameCaseInsensitive, so these are the data types the app has.
        var process = Process(
            Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"),
            SigningTask(
                "Task_Sign",
                "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType></altinn:signatureConfig>"
            )
        );
        var metadata = """
            {
              "DataTypes": [
                { "ID": "model", "AppLogic": { "ClassRef": "App.Models.Model" }, "TaskID": "Task_1" },
                { "Id": "ref-data-as-pdf", "AllowedContentTypes": ["image/png"] },
                { "id": "signatures", "AllowedContributors": ["org:ttd"], "TaskId": "Task_Sign" },
                { "id": "other", "TASKID": "Task_Gone" }
              ]
            }
            """;

        var diagnostics = Collect(process, metadata);

        Assert.Equal([CannotHold, NotAppOwned, TaskNotFound], diagnostics.Select(d => d.Id).Order());
        Assert.Contains(
            "allowedContentTypes does not include 'application/pdf'",
            Assert.Single(diagnostics, d => d.Id == CannotHold).GetMessage()
        );
    }

    [Fact]
    public void Trailing_Commas_In_Applicationmetadata_Are_Accepted()
    {
        var process = Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"));
        var metadata = """
            {
              "dataTypes": [
                { "id": "model", "appLogic": { "classRef": "App.Models.Model", }, "taskId": "Task_1", },
                { "id": "other", "taskId": "Task_Gone", },
              ],
            }
            """;

        var diagnostics = Collect(process, metadata);

        Assert.Equal([PdfDataTypeMissing, TaskNotFound], diagnostics.Select(d => d.Id).Order());
    }

    [Fact]
    public void The_First_Data_Type_With_An_Id_Is_The_One_The_Runtime_Finds()
    {
        var process = Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"));
        var metadata = Metadata(
            Model,
            """{ "id": "ref-data-as-pdf", "appLogic": { "classRef": "X" } }""",
            RefDataAsPdf
        );

        Assert.Equal(CannotHold, Assert.Single(Collect(process, metadata)).Id);
    }

    [Theory]
    // Unreadable applicationmetadata.json is reported by ALTINNAPP0002, and an unreadable process by the app at startup.
    [InlineData("{ \"dataTypes\": [ { \"id\": \"model\" } ")]
    [InlineData("{ \"dataTypes\": [ { \"id\": \"")]
    // Except content after the root value, which nothing reports at build time; the app does not start.
    [InlineData("{ \"dataTypes\": [], } garbage")]
    [InlineData("{ \"dataTypes\": [], \"x\": [1 2] }")]
    [InlineData("[]")]
    [InlineData("{ \"dataTypes\": {} }")]
    [InlineData("{ }")]
    public void Unreadable_Applicationmetadata_Is_Ignored(string metadata)
    {
        Assert.Empty(Collect(Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask")), metadata));
    }

    [Fact]
    public void Unreadable_Process_Is_Ignored()
    {
        Assert.Empty(Collect("<bpmn:definitions", Metadata(Model)));
    }

    [Fact]
    public void More_Than_One_Process_Is_Ignored()
    {
        var process = Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"))
            .Replace("</bpmn:definitions>", "<bpmn:process id=\"Other\" /></bpmn:definitions>");

        Assert.Empty(Collect(process, Metadata(Model)));
    }

    [Fact]
    public void Missing_Or_Duplicate_Files_Are_Ignored()
    {
        var process = Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"));
        var metadata = Metadata(Model);
        AdditionalText processFile = new InMemoryAdditionalText(ProcessPath, process);
        AdditionalText metadataFile = new InMemoryAdditionalText(MetadataPath, metadata);

        Assert.Single(Run(processFile, metadataFile));
        Assert.Empty(Run(processFile));
        Assert.Empty(Run(metadataFile));
        Assert.Empty(
            Run(
                processFile,
                metadataFile,
                new InMemoryAdditionalText("/repo/Other/config/applicationmetadata.json", metadata)
            )
        );
        Assert.Empty(
            Run(
                processFile,
                metadataFile,
                new InMemoryAdditionalText("/repo/Other/config/process/process.bpmn", process)
            )
        );
    }

    [Fact]
    public void Windows_Paths_Are_Recognized()
    {
        var diagnostics = Run(
            new InMemoryAdditionalText(
                @"C:\repo\App\config\process\process.bpmn",
                Process(Task("Task_Pdf", "pdf", element: "bpmn:serviceTask"))
            ),
            new InMemoryAdditionalText(@"C:\repo\App\config\applicationmetadata.json", Metadata(Model))
        );

        Assert.Equal(PdfDataTypeMissing, Assert.Single(diagnostics).Id);
    }

    private static List<Diagnostic> Collect(string process, string metadata) =>
        Run(new InMemoryAdditionalText(ProcessPath, process), new InMemoryAdditionalText(MetadataPath, metadata));

    private static List<Diagnostic> Run(params AdditionalText[] files)
    {
        var diagnostics = new List<Diagnostic>();
        ProcessDataTypeUtils.CollectDiagnostics(ImmutableArray.Create(files), CancellationToken.None, diagnostics);
        return diagnostics;
    }

    /// <summary>The text a diagnostic in process.bpmn points at.</summary>
    private static string Text(string process, Diagnostic diagnostic) =>
        process.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length);

    /// <summary>The data type id quoted in an ALTINNAPP1013 or ALTINNAPP1018 message, quotes included.</summary>
    private static string QuotedDataType(string message)
    {
        const string marker = "names the data type ";
        var start = message.IndexOf(marker, StringComparison.Ordinal) + marker.Length;
        var end = message.IndexOf('\'', start + 1);
        return message.Substring(start, end - start + 1);
    }

    private static string Metadata(params string[] dataTypes) =>
        $$"""
            {
              "id": "ttd/app",
              "org": "ttd",
              "dataTypes": [
                {{string.Join(",\n    ", dataTypes)}}
              ]
            }
            """;

    private static string SigningTask(string id, string config) => Task(id, "signing", config);

    private static string Task(string id, string taskType, string config = "", string element = "bpmn:task") =>
        $"""
                <{element} id="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>{taskType}</altinn:taskType>
                      {config}
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </{element}>

            """;

    private static string Gateway(string id, string connectedDataTypeId) =>
        $"""
                <bpmn:exclusiveGateway id="{id}">
                  <bpmn:extensionElements>
                    <altinn:gatewayExtension>
                      <altinn:connectedDataTypeId>{connectedDataTypeId}</altinn:connectedDataTypeId>
                    </altinn:gatewayExtension>
                  </bpmn:extensionElements>
                </bpmn:exclusiveGateway>

            """;

    private static string Process(params string[] elements) =>
        $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions_1">
              <bpmn:process id="Altinn_Process_Definition" isExecutable="true">
                <bpmn:startEvent id="StartEvent_1" />
                <bpmn:task id="Task_1">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>data</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
            {string.Concat(elements)}    <bpmn:endEvent id="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """;
}
