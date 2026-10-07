using System.Collections.Immutable;
using System.Reflection;
using System.Xml.Serialization;
using Altinn.App.Analyzers.Process;
using Altinn.App.Analyzers.Tests.Fixtures;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.CodeAnalysis;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.App.Analyzers.Tests.Process;

public class TaskConfigurationUtilsTests
{
    private const string ProcessPath = "/repo/App/config/process/process.bpmn";

    private const string SettingInvalid = "ALTINNAPP1020";
    private const string ElementIgnored = "ALTINNAPP1021";
    private const string UnusableEnvironmentAttribute = "ALTINNAPP1022";

    private const string SignatureConfig = """
        <altinn:signatureConfig>
          <altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign>
          <altinn:signatureDataType>signatures</altinn:signatureDataType>
        </altinn:signatureConfig>
        """;

    private const string EFormidlingSettings = """
        <altinn:process>urn:no:difi:profile:arkivmelding:administrasjon:ver1.0</altinn:process>
        <altinn:standard>urn:no:difi:arkivmelding:xsd::arkivmelding</altinn:standard>
        <altinn:typeVersion>2.0</altinn:typeVersion>
        <altinn:type>arkivmelding</altinn:type>
        <altinn:securityLevel>3</altinn:securityLevel>
        """;

    [Fact]
    public void A_Complete_Configuration_Is_Valid()
    {
        var process = Process(
            Task(
                "Task_Sign",
                "signing",
                """
                <altinn:actions><altinn:action>sign</altinn:action><altinn:action>reject</altinn:action></altinn:actions>
                <altinn:signatureConfig>
                  <altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign>
                  <altinn:signatureDataType>signatures</altinn:signatureDataType>
                  <altinn:uniqueFromSignaturesInDataTypes><altinn:dataType>other</altinn:dataType></altinn:uniqueFromSignaturesInDataTypes>
                  <altinn:signeeProviderId>founders</altinn:signeeProviderId>
                  <altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId>
                  <altinn:signingPdfDataType>signingPdf</altinn:signingPdfDataType>
                  <altinn:correspondenceResource env="tt02">resource-test</altinn:correspondenceResource>
                  <altinn:correspondenceResource env="Production">resource-prod</altinn:correspondenceResource>
                  <altinn:runDefaultValidator>true</altinn:runDefaultValidator>
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
            Task(
                "Task_Pdf",
                "pdf",
                """
                <altinn:pdfConfig>
                  <altinn:filenameTextResourceKey>pdf.name</altinn:filenameTextResourceKey>
                  <altinn:autoPdfTaskIds><altinn:taskId>Task_1</altinn:taskId></altinn:autoPdfTaskIds>
                </altinn:pdfConfig>
                """,
                element: "bpmn:serviceTask"
            ),
            Task(
                "Task_SubformPdf",
                "subformPdf",
                """
                <altinn:subformPdfConfig>
                  <altinn:filenameTextResourceKey>subform.name</altinn:filenameTextResourceKey>
                  <altinn:subformComponentId>Subform</altinn:subformComponentId>
                  <altinn:subformDataTypeId>vehicle</altinn:subformDataTypeId>
                </altinn:subformPdfConfig>
                """,
                element: "bpmn:serviceTask"
            ),
            Task(
                "Task_Send",
                "eFormidling",
                $"""
                <altinn:eFormidlingConfig>
                  <altinn:disabled env="dev">true</altinn:disabled>
                  <altinn:receiver>910075918</altinn:receiver>
                  {EFormidlingSettings}
                  <altinn:dpfShipmentType>altinn3.skjema</altinn:dpfShipmentType>
                  <altinn:dataTypes><altinn:dataType>model</altinn:dataType></altinn:dataTypes>
                  <altinn:dataTypes env="prod"><altinn:dataType>model</altinn:dataType></altinn:dataTypes>
                </altinn:eFormidlingConfig>
                """,
                element: "bpmn:serviceTask"
            )
        );

        Assert.Empty(Collect(process));
    }

    [Fact]
    public async Task Reports_Each_Kind_Of_Problem()
    {
        var process = Process(
            Task(
                "Task_Sign",
                "signing",
                """
                <altinn:signatureConfig>
                  <altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign>
                  <altinn:signatureDataType>signatures</altinn:signatureDataType>
                  <altinn:signingPdfDatatype>signingPdf</altinn:signingPdfDatatype>
                  <altinn:signeeProviderId>founders</altinn:signeeProviderId>
                  <altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId>
                  <altinn:correspondenceResource env="tt03">resource</altinn:correspondenceResource>
                </altinn:signatureConfig>
                """
            )
        );

        var diagnostics = Collect(process);

        Assert.Equal([ElementIgnored, SettingInvalid, UnusableEnvironmentAttribute], diagnostics.Select(d => d.Id));
        await Verify(diagnostics);
    }

    [Fact]
    public void A_Signing_Task_Without_Configuration_Misses_What_It_Signs_And_Where()
    {
        var process = Process(Task("Task_Sign", "signing"));

        var diagnostics = Collect(process);

        Assert.All(diagnostics, d => Assert.Equal(SettingInvalid, d.Id));
        Assert.All(diagnostics, d => Assert.Equal(DiagnosticSeverity.Error, d.Severity));
        Assert.Equal(
            [
                "Task 'Task_Sign' has no <altinn:signatureConfig><altinn:signatureDataType>, so the app does not start. "
                    + "Name the data type that stores the signatures.",
                "Task 'Task_Sign' names no data type in <altinn:signatureConfig><altinn:dataTypesToSign>, so the sign "
                    + "action fails every time. List the data types to sign as <altinn:dataType> entries.",
            ],
            diagnostics.Select(d => d.GetMessage())
        );
        Assert.All(diagnostics, d => Assert.Equal("<bpmn:task", Text(process, d)));
    }

    [Theory]
    // Altinn Studio creates a signing task with an empty list.
    [InlineData("<altinn:dataTypesToSign />")]
    [InlineData(
        "<altinn:dataTypesToSign><altinn:dataType /><altinn:dataType> </altinn:dataType></altinn:dataTypesToSign>"
    )]
    public void A_Signing_Task_That_Names_Nothing_To_Sign_Fails(string dataTypesToSign)
    {
        var process = Process(
            Task(
                "Task_Sign",
                "signing",
                $"<altinn:signatureConfig>{dataTypesToSign}<altinn:signatureDataType>signatures</altinn:signatureDataType></altinn:signatureConfig>"
            )
        );

        var diagnostic = Assert.Single(Collect(process));

        Assert.Equal(SettingInvalid, diagnostic.Id);
        Assert.StartsWith("Task 'Task_Sign' names no data type in", diagnostic.GetMessage());
        Assert.Equal("<altinn:dataTypesToSign", Text(process, diagnostic));
    }

    [Fact]
    public void Data_Types_To_Sign_In_A_Repeated_List_Count()
    {
        // The runtime joins the entries of every occurrence of a list.
        var process = Process(
            Task(
                "Task_Sign",
                "signing",
                """
                <altinn:signatureConfig>
                  <altinn:dataTypesToSign />
                  <altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign>
                  <altinn:signatureDataType>signatures</altinn:signatureDataType>
                </altinn:signatureConfig>
                """
            )
        );

        Assert.Empty(Collect(process));
    }

    [Fact]
    public void An_Empty_Signature_Data_Type_Stops_The_App_In_Development_And_Fails_The_Sign_Action_Elsewhere()
    {
        var process = Process(
            Task(
                "Task_Sign",
                "signing",
                "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign><altinn:signatureDataType /></altinn:signatureConfig>"
            )
        );

        var diagnostic = Assert.Single(Collect(process));

        Assert.Equal(
            "Task 'Task_Sign' has an empty <altinn:signatureConfig><altinn:signatureDataType>, so the app does not start "
                + "in Development, and the sign action fails every time elsewhere. Name the data type that stores the "
                + "signatures.",
            diagnostic.GetMessage()
        );
        Assert.Equal("<altinn:signatureDataType", Text(process, diagnostic));
    }

    [Theory]
    [InlineData(
        "<altinn:signeeProviderId>founders</altinn:signeeProviderId>",
        "signeeProviderId",
        "has <altinn:signatureConfig><altinn:signeeProviderId> but no <altinn:signeeStatesDataTypeId>"
    )]
    [InlineData(
        "<altinn:signeeStatesDataTypeId>states</altinn:signeeStatesDataTypeId>",
        "signeeStatesDataTypeId",
        "has <altinn:signatureConfig><altinn:signeeStatesDataTypeId> but no <altinn:signeeProviderId>"
    )]
    // Startup checks the two for null, so an empty one counts as set, and fails where it is used.
    [InlineData(
        "<altinn:signeeProviderId />" + "<altinn:signeeStatesDataTypeId>states</altinn:signeeStatesDataTypeId>",
        "signeeProviderId",
        "has an empty <altinn:signatureConfig><altinn:signeeProviderId>"
    )]
    [InlineData(
        "<altinn:signeeProviderId>founders</altinn:signeeProviderId>" + "<altinn:signeeStatesDataTypeId />",
        "signeeStatesDataTypeId",
        "has an empty <altinn:signatureConfig><altinn:signeeStatesDataTypeId>"
    )]
    public void Signee_Provider_And_Signee_States_Go_Together(string settings, string anchor, string expected)
    {
        var process = Process(
            Task(
                "Task_Sign",
                "signing",
                $"""
                <altinn:signatureConfig>
                  <altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign>
                  <altinn:signatureDataType>signatures</altinn:signatureDataType>
                  {settings}
                  <altinn:correspondenceResource>resource</altinn:correspondenceResource>
                </altinn:signatureConfig>
                """
            )
        );

        var diagnostic = Assert.Single(Collect(process));

        Assert.Equal(SettingInvalid, diagnostic.Id);
        Assert.StartsWith($"Task 'Task_Sign' {expected}, so ", diagnostic.GetMessage());
        Assert.Equal($"<altinn:{anchor}", Text(process, diagnostic));
    }

    [Theory]
    [InlineData(
        "",
        "has <altinn:signatureConfig><altinn:signeeProviderId> but no <altinn:correspondenceResource> for the Staging and Production environments",
        "signeeProviderId"
    )]
    [InlineData("<altinn:correspondenceResource>resource</altinn:correspondenceResource>", null, null)]
    [InlineData(
        "<altinn:correspondenceResource env=\"TT02\">resource</altinn:correspondenceResource>",
        "has <altinn:signatureConfig><altinn:signeeProviderId> but no <altinn:correspondenceResource> for the Production environment",
        "signeeProviderId"
    )]
    // Development only logs a warning at startup.
    [InlineData(
        "<altinn:correspondenceResource env=\"dev\">resource</altinn:correspondenceResource>",
        "has <altinn:signatureConfig><altinn:signeeProviderId> but no <altinn:correspondenceResource> for the Staging and Production environments",
        "signeeProviderId"
    )]
    [InlineData(
        "<altinn:correspondenceResource env=\"staging\">resource</altinn:correspondenceResource><altinn:correspondenceResource env=\"prod\">resource</altinn:correspondenceResource>",
        null,
        null
    )]
    // An entry for the environment wins over one without env, even when it is empty.
    [InlineData(
        "<altinn:correspondenceResource>resource</altinn:correspondenceResource><altinn:correspondenceResource env=\"prod\" />",
        "has an empty <altinn:signatureConfig><altinn:correspondenceResource> for the Production environment",
        "correspondenceResource"
    )]
    // Of several entries for one environment, the last one wins.
    [InlineData(
        "<altinn:correspondenceResource env=\"prod\">resource</altinn:correspondenceResource><altinn:correspondenceResource env=\"production\"> </altinn:correspondenceResource><altinn:correspondenceResource env=\"tt02\">resource</altinn:correspondenceResource>",
        "has an empty <altinn:signatureConfig><altinn:correspondenceResource> for the Production environment",
        "correspondenceResource"
    )]
    public void Delegated_Signing_Needs_A_Correspondence_Resource_In_Staging_And_Production(
        string resources,
        string? expected,
        string? anchor
    )
    {
        var process = Process(
            Task(
                "Task_Sign",
                "signing",
                $"""
                <altinn:signatureConfig>
                  <altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign>
                  <altinn:signatureDataType>signatures</altinn:signatureDataType>
                  <altinn:signeeProviderId>founders</altinn:signeeProviderId>
                  <altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId>
                  {resources}
                </altinn:signatureConfig>
                """
            )
        );

        var diagnostics = Collect(process);

        if (expected is null)
        {
            Assert.Empty(diagnostics);
            return;
        }

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(SettingInvalid, diagnostic.Id);
        Assert.StartsWith($"Task 'Task_Sign' {expected}, so the app does not start there.", diagnostic.GetMessage());
        Assert.Equal($"<altinn:{anchor}", Text(process, diagnostic));
    }

    [Fact]
    public void Signing_Without_A_Signee_Provider_Needs_No_Correspondence_Resource()
    {
        Assert.Empty(Collect(Process(Task("Task_Sign", "signing", SignatureConfig))));
    }

    [Theory]
    [InlineData("", 2)]
    [InlineData("<altinn:paymentConfig />", 2)]
    [InlineData(
        "<altinn:paymentConfig><altinn:paymentDataType>payment</altinn:paymentDataType></altinn:paymentConfig>",
        1
    )]
    [InlineData(
        "<altinn:paymentConfig><altinn:paymentDataType> </altinn:paymentDataType><altinn:paymentReceiptPdfDataType /></altinn:paymentConfig>",
        2
    )]
    public void A_Payment_Task_Needs_Both_Of_Its_Data_Types(string config, int expected)
    {
        // Startup reports only the first one that is missing; the build reports both.
        var process = Process(Task("Task_Pay", "payment", config));

        var diagnostics = Collect(process);

        Assert.Equal(expected, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(SettingInvalid, d.Id));
        Assert.All(diagnostics, d => Assert.Contains(", so the app does not start. ", d.GetMessage()));
    }

    [Theory]
    [InlineData("", "has no <altinn:subformPdfConfig>", "bpmn:serviceTask")]
    [InlineData(
        "<altinn:subformPdfConfig><altinn:subformDataTypeId>vehicle</altinn:subformDataTypeId></altinn:subformPdfConfig>",
        "has no <altinn:subformPdfConfig><altinn:subformComponentId>",
        "altinn:subformPdfConfig"
    )]
    [InlineData(
        "<altinn:subformPdfConfig><altinn:subformComponentId>Subform</altinn:subformComponentId><altinn:subformDataTypeId /></altinn:subformPdfConfig>",
        "has an empty <altinn:subformPdfConfig><altinn:subformDataTypeId>",
        "altinn:subformDataTypeId"
    )]
    public void A_Subform_Pdf_Task_Needs_Its_Component_And_Data_Type(string config, string expected, string anchor)
    {
        var process = Process(Task("Task_SubformPdf", "subformPdf", config, element: "bpmn:serviceTask"));

        var diagnostic = Assert.Single(Collect(process));

        Assert.Equal(SettingInvalid, diagnostic.Id);
        Assert.StartsWith($"Task 'Task_SubformPdf' {expected}, so the app does not start.", diagnostic.GetMessage());
        Assert.Equal($"<{anchor}", Text(process, diagnostic));
    }

    [Fact]
    public void An_EFormidling_Task_Needs_Its_Configuration()
    {
        var process = Process(Task("Task_Send", "eFormidling", element: "bpmn:serviceTask"));

        var diagnostic = Assert.Single(Collect(process));

        Assert.Equal(
            "Task 'Task_Send' has no <altinn:eFormidlingConfig>, so the app does not start. Add it, with the settings "
                + "of the shipment.",
            diagnostic.GetMessage()
        );
    }

    [Fact]
    public void EFormidling_Settings_Are_Required_In_Every_Environment_Even_Where_It_Is_Disabled()
    {
        var process = Process(
            EFormidlingTask(
                """
                <altinn:disabled env="dev">true</altinn:disabled>
                <altinn:process env="prod">urn:no:difi:profile:arkivmelding:administrasjon:ver1.0</altinn:process>
                <altinn:standard>urn:no:difi:arkivmelding:xsd::arkivmelding</altinn:standard>
                <altinn:standard env="tt02" />
                <altinn:typeVersion>2.0</altinn:typeVersion>
                <altinn:type>arkivmelding</altinn:type>
                <altinn:securityLevel>high</altinn:securityLevel>
                <altinn:securityLevel env="local">3</altinn:securityLevel>
                """
            )
        );

        var diagnostics = Collect(process);

        Assert.Equal(
            [
                "Task 'Task_Send' has no <altinn:eFormidlingConfig><altinn:process> for the Development and Staging "
                    + "environments, so the app does not start there. Add one without env, or one for each of those "
                    + "environments. The app requires it even where eFormidling is disabled.",
                "Task 'Task_Send' has an empty <altinn:eFormidlingConfig><altinn:standard> for the Staging environment, "
                    + "so the app does not start there. Fill it in.",
                "Task 'Task_Send' has 'high' in <altinn:eFormidlingConfig><altinn:securityLevel> for the Staging and "
                    + "Production environments, which is not a whole number, so the app does not start there. Use a "
                    + "whole number, such as 3.",
            ],
            diagnostics.Select(d => d.GetMessage())
        );
        Assert.Equal(
            ["<altinn:eFormidlingConfig", "<altinn:standard", "<altinn:securityLevel"],
            diagnostics.Select(d => Text(process, d))
        );
    }

    [Fact]
    public void A_Setting_Missing_Everywhere_Names_No_Environment()
    {
        var process = Process(
            EFormidlingTask(EFormidlingSettings.Replace("<altinn:typeVersion>2.0</altinn:typeVersion>", ""))
        );

        var diagnostic = Assert.Single(Collect(process));

        Assert.Equal(
            "Task 'Task_Send' has no <altinn:eFormidlingConfig><altinn:typeVersion>, so the app does not start. Add it.",
            diagnostic.GetMessage()
        );
    }

    [Theory]
    [InlineData(
        "<altinn:disabled>yes</altinn:disabled>",
        "has 'yes' in <altinn:eFormidlingConfig><altinn:disabled>, which is not true or false"
    )]
    // Optional: an empty value means enabled.
    [InlineData("<altinn:disabled /><altinn:disabled env=\"prod\"> </altinn:disabled>", null)]
    [InlineData("<altinn:disabled env=\"prod\">FALSE</altinn:disabled>", null)]
    public void Disabled_Must_Be_True_Or_False(string disabled, string? expected)
    {
        var diagnostics = Collect(Process(EFormidlingTask(disabled + EFormidlingSettings)));

        if (expected is null)
        {
            Assert.Empty(diagnostics);
            return;
        }

        Assert.StartsWith(
            $"Task 'Task_Send' {expected}, so the app does not start.",
            Assert.Single(diagnostics).GetMessage()
        );
    }

    /// <summary>
    /// Pins the analyzer to <c>AltinnEFormidlingConfiguration.Validate</c>: deserialized as the runtime does, a
    /// configuration fails for an environment exactly when the analyzer names that environment.
    /// </summary>
    [Theory]
    [InlineData(EFormidlingSettings)]
    [InlineData("")]
    [InlineData(
        "<altinn:process env=\"dev\">p</altinn:process><altinn:standard>s</altinn:standard><altinn:typeVersion>v</altinn:typeVersion><altinn:type>t</altinn:type><altinn:securityLevel> 4 </altinn:securityLevel>"
    )]
    [InlineData(
        "<altinn:process>p</altinn:process><altinn:process env=\"prod\" /><altinn:standard>s</altinn:standard><altinn:typeVersion>v</altinn:typeVersion><altinn:type>t</altinn:type><altinn:securityLevel>3</altinn:securityLevel>"
    )]
    [InlineData(
        "<altinn:process>p</altinn:process><altinn:standard env=\"Test\">s</altinn:standard><altinn:standard env=\"yt01\" /><altinn:typeVersion>v</altinn:typeVersion><altinn:type>t</altinn:type><altinn:securityLevel>3</altinn:securityLevel>"
    )]
    [InlineData(
        "<altinn:process>p</altinn:process><altinn:standard>s</altinn:standard><altinn:typeVersion>v</altinn:typeVersion><altinn:type>t</altinn:type><altinn:securityLevel env=\"prod\">3</altinn:securityLevel><altinn:securityLevel>x</altinn:securityLevel>"
    )]
    [InlineData(
        "<altinn:process>p</altinn:process><altinn:standard>s</altinn:standard><altinn:typeVersion>v</altinn:typeVersion><altinn:type>t</altinn:type><altinn:securityLevel>3</altinn:securityLevel><altinn:disabled env=\"tt02\">nope</altinn:disabled>"
    )]
    // Each required setting on its own: without it, everything else being complete.
    [InlineData(
        "<altinn:process>p</altinn:process><altinn:standard>s</altinn:standard><altinn:type>t</altinn:type><altinn:securityLevel>3</altinn:securityLevel>"
    )]
    [InlineData(
        "<altinn:process>p</altinn:process><altinn:standard>s</altinn:standard><altinn:typeVersion>v</altinn:typeVersion><altinn:securityLevel>3</altinn:securityLevel>"
    )]
    [InlineData(
        "<altinn:process>p</altinn:process><altinn:standard>s</altinn:standard><altinn:typeVersion>v</altinn:typeVersion><altinn:type>t</altinn:type>"
    )]
    [InlineData(
        "<altinn:process>p</altinn:process><altinn:standard>s</altinn:standard><altinn:typeVersion>v</altinn:typeVersion><altinn:type env=\"prod\">t</altinn:type><altinn:securityLevel>3</altinn:securityLevel>"
    )]
    // An unrecognized env never applies in the three environments, and an env with a prefix is not read at all.
    [InlineData(
        "<altinn:process env=\"tt03\">p</altinn:process><altinn:standard altinn:env=\"prod\">s</altinn:standard><altinn:typeVersion>v</altinn:typeVersion><altinn:type>t</altinn:type><altinn:securityLevel>3</altinn:securityLevel>"
    )]
    public void EFormidling_Settings_Fail_Where_The_Runtime_Fails(string settings)
    {
        var config = $"<altinn:eFormidlingConfig>{settings}</altinn:eFormidlingConfig>";
        var diagnostics = Collect(Process(EFormidlingTask(settings))).Where(d => d.Id == SettingInvalid).ToList();
        var runtime = Deserialize(config).EFormidlingConfiguration;
        Assert.NotNull(runtime);

        foreach (var environment in HostingEnvironments.All)
        {
            var runtimeFails = Fails(() => runtime.Validate(Enum.Parse<HostingEnvironment>(environment)));
            var analyzerFails = diagnostics.Exists(d => Names(d.GetMessage(), environment));
            Assert.True(
                runtimeFails == analyzerFails,
                $"{environment}: the runtime {(runtimeFails ? "fails" : "passes")}, the analyzer reports "
                    + string.Join(" | ", diagnostics.Select(d => d.GetMessage()))
            );
        }
    }

    /// <summary>Pins the payment and subformPdf checks to the runtime's Validate: they fail together.</summary>
    [Theory]
    [InlineData("payment", "")]
    [InlineData(
        "payment",
        "<altinn:paymentConfig><altinn:paymentDataType>a</altinn:paymentDataType></altinn:paymentConfig>"
    )]
    [InlineData(
        "payment",
        "<altinn:paymentConfig><altinn:paymentDataType>a</altinn:paymentDataType><altinn:paymentReceiptPdfDataType> </altinn:paymentReceiptPdfDataType></altinn:paymentConfig>"
    )]
    [InlineData(
        "payment",
        "<altinn:paymentConfig><altinn:paymentDataType>a</altinn:paymentDataType><altinn:paymentReceiptPdfDataType>b</altinn:paymentReceiptPdfDataType></altinn:paymentConfig>"
    )]
    [InlineData("subformPdf", "<altinn:subformPdfConfig />")]
    [InlineData(
        "subformPdf",
        "<altinn:subformPdfConfig><altinn:subformComponentId>c</altinn:subformComponentId><altinn:subformDataTypeId /></altinn:subformPdfConfig>"
    )]
    [InlineData(
        "subformPdf",
        "<altinn:subformPdfConfig><altinn:subformComponentId>c</altinn:subformComponentId><altinn:subformDataTypeId>d</altinn:subformDataTypeId></altinn:subformPdfConfig>"
    )]
    public void Payment_And_Subform_Pdf_Settings_Fail_Where_The_Runtime_Fails(string taskType, string config)
    {
        var diagnostics = Collect(Process(Task("Task_1b", taskType, config)));
        var extension = Deserialize(config);

        var runtimeFails =
            taskType == "payment"
                ? Fails(() => extension.PaymentConfiguration?.Validate())
                : extension.SubformPdfConfiguration is not { } subformPdf || Fails(() => subformPdf.Validate());

        Assert.Equal(runtimeFails, diagnostics.Count > 0);
    }

    /// <summary>
    /// Pins the signing checks that stop the app from starting to <c>SigningProcessTask.ValidateConfiguration</c>,
    /// with a registered signee provider 'founders' and the signing data types declared as app-owned: it finds
    /// problems for an environment exactly when the analyzer names that environment. Settings the sign action needs
    /// are not checked at startup and are left out.
    /// </summary>
    [Theory]
    [InlineData(SignatureConfig)]
    [InlineData("")]
    [InlineData(
        "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeProviderId>founders</altinn:signeeProviderId><altinn:correspondenceResource>r</altinn:correspondenceResource></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeProviderId>founders</altinn:signeeProviderId><altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeProviderId>founders</altinn:signeeProviderId><altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId><altinn:correspondenceResource env=\"tt02\">r</altinn:correspondenceResource></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeProviderId>founders</altinn:signeeProviderId><altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId><altinn:correspondenceResource env=\"tt02\">r</altinn:correspondenceResource><altinn:correspondenceResource env=\"prod\">r</altinn:correspondenceResource></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeProviderId>founders</altinn:signeeProviderId><altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId><altinn:correspondenceResource>r</altinn:correspondenceResource><altinn:correspondenceResource env=\"prod\" /></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeProviderId>founders</altinn:signeeProviderId><altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId><altinn:correspondenceResource altinn:env=\"dev\">r</altinn:correspondenceResource></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeProviderId /><altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId><altinn:correspondenceResource>r</altinn:correspondenceResource></altinn:signatureConfig>"
    )]
    // An empty data type id passes the null checks, and fails only where startup looks it up: in Development.
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType /><altinn:dataTypesToSign><altinn:dataType>model</altinn:dataType></altinn:dataTypesToSign></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeProviderId>founders</altinn:signeeProviderId><altinn:signeeStatesDataTypeId> </altinn:signeeStatesDataTypeId><altinn:correspondenceResource>r</altinn:correspondenceResource></altinn:signatureConfig>"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>signatures</altinn:signatureDataType><altinn:signeeStatesDataTypeId /></altinn:signatureConfig>"
    )]
    public void Signing_Settings_Fail_Where_The_Runtime_Fails(string config)
    {
        var diagnostics = Collect(Process(Task("Task_Sign", "signing", config)))
            .Where(d => d.Id == SettingInvalid && d.GetMessage().Contains("so the app does not start"))
            .ToList();
        var processReader = DispatchProxy.Create<IProcessReader, ProcessReaderStub>();
        ((ProcessReaderStub)processReader).TaskExtension = Deserialize(config);
        var services = new ServiceCollection().AddSingleton<ISigneeProvider, FoundersSigneeProvider>();
        var task = new SigningProcessTask(
            null!,
            processReader,
            services.BuildServiceProvider(),
            NullLogger<SigningProcessTask>.Instance,
            null!,
            null!
        );
        var metadata = new ApplicationMetadata("ttd/app")
        {
            DataTypes = new[] { "model", "signatures", "signeeStates" }
                .Select(id => new DataType { Id = id, AllowedContributors = ["app:owned"] })
                .ToList(),
        };

        foreach (var environment in HostingEnvironments.All)
        {
            var context = new ProcessTaskValidationContext
            {
                TaskId = "Task_Sign",
                Environment = Enum.Parse<HostingEnvironment>(environment),
                ApplicationMetadata = metadata,
            };
            var runtimeFindings = task.ValidateConfiguration(context).ToList();
            var analyzerFails = diagnostics.Exists(d => Names(d.GetMessage(), environment));
            Assert.True(
                runtimeFindings.Count > 0 == analyzerFails,
                $"{environment}: the runtime finds [{string.Join(" | ", runtimeFindings)}], the analyzer reports "
                    + string.Join(" | ", diagnostics.Select(d => d.GetMessage()))
            );
        }
    }

    /// <summary>
    /// Pins the values the analyzer reports as unreadable to the runtime's XmlSerializer: loading the process fails
    /// exactly when it reports one, whatever the task's type.
    /// </summary>
    [Theory]
    [InlineData("<altinn:runDefaultValidator>true</altinn:runDefaultValidator>", false)]
    [InlineData("<altinn:runDefaultValidator> true </altinn:runDefaultValidator>", false)]
    [InlineData("<altinn:runDefaultValidator>1</altinn:runDefaultValidator>", false)]
    [InlineData("<altinn:runDefaultValidator>0</altinn:runDefaultValidator>", false)]
    [InlineData("<altinn:runDefaultValidator />", true)]
    [InlineData("<altinn:runDefaultValidator> </altinn:runDefaultValidator>", true)]
    [InlineData("<altinn:runDefaultValidator>True</altinn:runDefaultValidator>", true)]
    [InlineData("<altinn:runDefaultValidator>yes</altinn:runDefaultValidator>", true)]
    // Only the first is read.
    [InlineData(
        "<altinn:runDefaultValidator>true</altinn:runDefaultValidator><altinn:runDefaultValidator>yes</altinn:runDefaultValidator>",
        false
    )]
    public void A_Run_Default_Validator_That_Is_Not_A_Boolean_Stops_The_App(string setting, bool fails)
    {
        AssertUnreadable($"<altinn:signatureConfig>{setting}</altinn:signatureConfig>", fails);
    }

    [Theory]
    [InlineData("type=\"serverAction\"", false)]
    [InlineData("type=\"processAction\"", false)]
    [InlineData("type=\"ServerAction\"", true)]
    [InlineData("type=\" serverAction\"", true)]
    [InlineData("type=\"\"", true)]
    // The runtime reads the attribute without a prefix only, and ignores this one.
    [InlineData("altinn:type=\"server\"", false)]
    public void An_Action_Type_That_Is_Not_Known_Stops_The_App(string attribute, bool fails)
    {
        AssertUnreadable(
            $"<altinn:actions><altinn:action>write</altinn:action><altinn:action {attribute}>lookup</altinn:action></altinn:actions>",
            fails
        );
    }

    [Fact]
    public void Only_The_First_Signature_Configuration_Is_Read_For_Its_Values()
    {
        AssertUnreadable(
            """
            <altinn:signatureConfig />
            <altinn:signatureConfig><altinn:runDefaultValidator>yes</altinn:runDefaultValidator></altinn:signatureConfig>
            """,
            fails: false
        );
    }

    [Fact]
    public void Only_The_Built_In_Task_Types_Are_Checked()
    {
        // The type is matched exactly, like the runtime; another type is the app's own task, with its own rules.
        var process = Process(
            Task("Task_A", "Signing"),
            Task("Task_B", "myPayment"),
            Task("Task_C", "eformidling", element: "bpmn:serviceTask")
        );

        Assert.Empty(Collect(process));
    }

    [Fact]
    public void Only_The_First_Configuration_Is_Read()
    {
        var process = Process(
            Task(
                "Task_Pay",
                "payment",
                """
                <altinn:paymentConfig><altinn:paymentDataType>payment</altinn:paymentDataType></altinn:paymentConfig>
                <altinn:paymentConfig><altinn:paymentReceiptPdfDataType>receipt</altinn:paymentReceiptPdfDataType></altinn:paymentConfig>
                """
            )
        );

        var diagnostics = Collect(process);

        Assert.Equal([SettingInvalid, ElementIgnored], diagnostics.Select(d => d.Id).Order());
        var ignored = diagnostics.Single(d => d.Id == ElementIgnored);
        Assert.Equal(
            "Task 'Task_Pay' has another <altinn:paymentConfig> in <altinn:taskExtension>, which the app ignores, "
                + "since it reads only the first. Keep only one of them.",
            ignored.GetMessage()
        );
        Assert.Equal(DiagnosticSeverity.Warning, ignored.Severity);
    }

    [Theory]
    [InlineData(
        "<altinn:signatureConfig><altinn:signingPdfDatatype>pdf</altinn:signingPdfDatatype></altinn:signatureConfig>",
        "has <altinn:signingPdfDatatype> in <altinn:signatureConfig>, which the app does not read, so the setting has no effect. Rename it to <altinn:signingPdfDataType>."
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:dataTypesToSign><altinn:datatype>model</altinn:datatype></altinn:dataTypesToSign></altinn:signatureConfig>",
        "has <altinn:datatype> in <altinn:signatureConfig><altinn:dataTypesToSign>, which the app does not read, so the setting has no effect. Rename it to <altinn:dataType>."
    )]
    [InlineData(
        "<altinn:paymentConfig><altinn:receiptDataType>pdf</altinn:receiptDataType></altinn:paymentConfig>",
        "has <altinn:receiptDataType> in <altinn:paymentConfig>, which the app does not read, so the setting has no effect. Remove it, or use one of the elements the app reads there: <altinn:paymentDataType>, <altinn:paymentReceiptPdfDataType>."
    )]
    [InlineData(
        "<altinn:paymentconfig />",
        "has <altinn:paymentconfig> in <altinn:taskExtension>, which the app does not read, so the setting has no effect. Rename it to <altinn:paymentConfig>."
    )]
    [InlineData(
        "<altinn:eFormidlingConfig><altinn:dataTypes><altinn:dataTypeId>model</altinn:dataTypeId></altinn:dataTypes></altinn:eFormidlingConfig>",
        "has <altinn:dataTypeId> in <altinn:eFormidlingConfig><altinn:dataTypes>, which the app does not read, so the setting has no effect. Remove it, or use one of the elements the app reads there: <altinn:dataType>."
    )]
    [InlineData(
        "<altinn:pdfConfig><filenameTextResourceKey>pdf.name</filenameTextResourceKey></altinn:pdfConfig>",
        "has <filenameTextResourceKey> in <altinn:pdfConfig>, which the app ignores, since it reads it only in the namespace 'http://altinn.no/process'. Write it as <altinn:filenameTextResourceKey>."
    )]
    [InlineData(
        "<altinn:subformPdfConfig><bpmn:subformComponentId>Subform</bpmn:subformComponentId></altinn:subformPdfConfig>",
        "has <bpmn:subformComponentId> in <altinn:subformPdfConfig>, which the app ignores, since it reads it only in the namespace 'http://altinn.no/process'. Write it as <altinn:subformComponentId>."
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signatureDataType>a</altinn:signatureDataType><altinn:signatureDataType>b</altinn:signatureDataType></altinn:signatureConfig>",
        "has another <altinn:signatureDataType> in <altinn:signatureConfig>, which the app ignores, since it reads only the first. Keep only one of them."
    )]
    public void Elements_The_App_Ignores_Are_Reported(string config, string expected)
    {
        // The task's type is not one with required settings, so only the ignored element is reported.
        var process = Process(Task("Task_2", "data", config));

        var diagnostic = Assert.Single(Collect(process));

        Assert.Equal(ElementIgnored, diagnostic.Id);
        Assert.Equal($"Task 'Task_2' {expected}", diagnostic.GetMessage());
        // On the element the message names; of several, the last, which is the one the app ignores.
        var tag = expected.Substring(expected.IndexOf('<'), expected.IndexOf('>') - expected.IndexOf('<'));
        Assert.Equal(process.LastIndexOf(tag, StringComparison.Ordinal), diagnostic.Location.SourceSpan.Start);
        Assert.Equal(tag, Text(process, diagnostic));
    }

    [Fact]
    public void Elements_Of_Other_Tools_And_Repeated_Entries_Are_Left_Alone()
    {
        var process = Process(
            Task(
                "Task_2",
                "data",
                """
                <other:note>written by another tool</other:note>
                <altinn:actions><altinn:action>write</altinn:action></altinn:actions>
                <altinn:actions><altinn:action type="serverAction">lookup</altinn:action></altinn:actions>
                <altinn:pdfConfig>
                  <altinn:autoPdfTaskIds><altinn:taskId>Task_1</altinn:taskId><altinn:taskId>Task_1b</altinn:taskId></altinn:autoPdfTaskIds>
                  <other:pdfOption />
                </altinn:pdfConfig>
                """
            )
        );

        Assert.Empty(Collect(process));
    }

    [Theory]
    [InlineData(
        "env=\"tt03\"",
        "has env=\"tt03\" on <altinn:eFormidlingConfig><altinn:receiver>, which is not an environment name the app recognizes, so the entry applies in none of Development, Staging and Production. Use one of the names the app recognizes: development, dev, local, localtest, staging, test, at22, at23, at24, tt02, yt01, production, prod, produksjon."
    )]
    [InlineData(
        "env=\" prod\"",
        "has env=\" prod\" on <altinn:eFormidlingConfig><altinn:receiver>, which is not an environment name the app recognizes, so the entry applies in none of Development, Staging and Production. Remove the spaces: env=\"prod\"."
    )]
    [InlineData(
        "altinn:env=\"prod\"",
        "has altinn:env=\"prod\" on <altinn:eFormidlingConfig><altinn:receiver>, which the app ignores, since it reads only an attribute named env, in lowercase and without a namespace prefix, so the entry applies in every environment. Write it as env=\"prod\"."
    )]
    [InlineData(
        "Env=\"prod\"",
        "has Env=\"prod\" on <altinn:eFormidlingConfig><altinn:receiver>, which the app ignores, since it reads only an attribute named env, in lowercase and without a namespace prefix, so the entry applies in every environment. Write it as env=\"prod\"."
    )]
    [InlineData("env=\"PRODUKSJON\"", null)]
    [InlineData("env=\"\"", null)]
    [InlineData("env=\"prod\" altinn:env=\"prod\"", null)]
    public void Environment_Names_The_App_Cannot_Use_Are_Reported(string attribute, string? expected)
    {
        var process = Process(
            EFormidlingTask($"<altinn:receiver {attribute}>910075918</altinn:receiver>" + EFormidlingSettings)
        );

        var diagnostics = Collect(process);

        if (expected is null)
        {
            Assert.Empty(diagnostics);
            return;
        }

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(UnusableEnvironmentAttribute, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.Equal($"Task 'Task_Send' {expected}", diagnostic.GetMessage());
        Assert.Equal("<altinn:receiver", Text(process, diagnostic));
    }

    [Fact]
    public void Environment_Names_Are_Checked_On_Data_Type_Lists_And_Correspondence_Resources()
    {
        var process = Process(
            EFormidlingTask(
                EFormidlingSettings
                    + "<altinn:dataTypes env=\"tt3\"><altinn:dataType>model</altinn:dataType></altinn:dataTypes>"
            ),
            Task(
                "Task_Sign",
                "signing",
                SignatureConfig.Replace(
                    "</altinn:signatureConfig>",
                    "<altinn:correspondenceResource env=\"preprod\">resource</altinn:correspondenceResource></altinn:signatureConfig>"
                )
            )
        );

        var diagnostics = Collect(process);

        Assert.All(diagnostics, d => Assert.Equal(UnusableEnvironmentAttribute, d.Id));
        Assert.Equal(
            ["<altinn:dataTypes", "<altinn:correspondenceResource"],
            diagnostics.Select(d => Text(process, d))
        );
    }

    [Theory]
    [InlineData(
        "<altinn:eFormidlingConfig><altinn:dataTypes><altinn:dataType env=\"prod\">model</altinn:dataType></altinn:dataTypes></altinn:eFormidlingConfig>",
        "env=\"prod\" on <altinn:eFormidlingConfig><altinn:dataTypes><altinn:dataType>, which the app ignores, since <altinn:dataType> does not take an env attribute, so the setting applies in every environment. Move env to the <altinn:dataTypes> that holds it, with one <altinn:dataTypes> per environment.",
        "altinn:dataType"
    )]
    [InlineData(
        "<altinn:signatureConfig><altinn:signeeProviderId env=\"tt02\">founders</altinn:signeeProviderId></altinn:signatureConfig>",
        "env=\"tt02\" on <altinn:signatureConfig><altinn:signeeProviderId>, which the app ignores, since <altinn:signeeProviderId> does not take an env attribute, so the setting applies in every environment. Remove it.",
        "altinn:signeeProviderId"
    )]
    [InlineData(
        "<altinn:eFormidlingConfig Env=\"prod\" />",
        "Env=\"prod\" on <altinn:eFormidlingConfig>, which the app ignores, since <altinn:eFormidlingConfig> does not take an env attribute, so the setting applies in every environment. Remove it.",
        "altinn:eFormidlingConfig"
    )]
    [InlineData(
        "<altinn:pdfConfig><altinn:autoPdfTaskIds altinn:env=\"dev\"><altinn:taskId>Task_1</altinn:taskId></altinn:autoPdfTaskIds></altinn:pdfConfig>",
        "altinn:env=\"dev\" on <altinn:pdfConfig><altinn:autoPdfTaskIds>, which the app ignores, since <altinn:autoPdfTaskIds> does not take an env attribute, so the setting applies in every environment. Remove it.",
        "altinn:autoPdfTaskIds"
    )]
    public void An_Env_On_An_Element_That_Takes_None_Is_Reported(string config, string expected, string anchor)
    {
        var process = Process(Task("Task_2", "data", config));

        var diagnostic = Assert.Single(Collect(process));

        Assert.Equal(UnusableEnvironmentAttribute, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.Equal($"Task 'Task_2' has {expected}", diagnostic.GetMessage());
        Assert.Equal($"<{anchor}", Text(process, diagnostic));
    }

    [Fact]
    public void An_Env_On_An_Element_That_Takes_One_Or_A_Blank_Env_Is_Not_Reported_As_Ignored()
    {
        var process = Process(
            Task(
                "Task_2",
                "data",
                """
                <altinn:signatureConfig>
                  <altinn:signeeProviderId env="">founders</altinn:signeeProviderId>
                  <altinn:correspondenceResource env="prod">resource</altinn:correspondenceResource>
                </altinn:signatureConfig>
                <altinn:eFormidlingConfig>
                  <altinn:receiver env="prod">910075918</altinn:receiver>
                  <altinn:dataTypes env="prod"><altinn:dataType>model</altinn:dataType></altinn:dataTypes>
                </altinn:eFormidlingConfig>
                """
            )
        );

        Assert.Empty(Collect(process));
    }

    [Fact]
    public void Tasks_Outside_The_Process_Are_Not_Read()
    {
        var process = Process(
            """
                <bpmn:subProcess id="Sub_1">
                  <bpmn:task id="Task_Inner">
                    <bpmn:extensionElements>
                      <altinn:taskExtension>
                        <altinn:taskType>signing</altinn:taskType>
                        <altinn:unknown />
                      </altinn:taskExtension>
                    </bpmn:extensionElements>
                  </bpmn:task>
                </bpmn:subProcess>

            """
        );

        Assert.Empty(Collect(process));
    }

    private static bool Names(string message, string environment) =>
        message.Contains(environment, StringComparison.Ordinal)
        || !HostingEnvironments.All.Any(e => message.Contains(e, StringComparison.Ordinal));

    private static bool Fails(Action validate)
    {
        try
        {
            validate();
            return false;
        }
        catch (ApplicationConfigException)
        {
            return true;
        }
    }

    /// <summary>
    /// Asserts that the process with a task holding <paramref name="config"/> fails to load in the runtime as
    /// <paramref name="fails"/> says, and that the analyzer reports that it stops the app exactly then.
    /// </summary>
    private static void AssertUnreadable(string config, bool fails)
    {
        var process = Process(Task("Task_2", "data", config));
        bool runtimeFails;
        try
        {
            // As ProcessReader loads it.
            new XmlSerializer(typeof(Definitions)).Deserialize(new StringReader(process));
            runtimeFails = false;
        }
        catch (InvalidOperationException)
        {
            runtimeFails = true;
        }

        var diagnostics = Collect(process).Where(d => d.Id == SettingInvalid).ToList();

        Assert.Equal(fails, runtimeFails);
        Assert.Equal(fails, diagnostics.Count > 0);
        Assert.All(diagnostics, d => Assert.Contains(", so the app does not start. ", d.GetMessage()));
    }

    /// <summary>An <see cref="IProcessReader"/> that knows only the configuration of the task being validated.</summary>
    public class ProcessReaderStub : DispatchProxy
    {
        internal AltinnTaskExtension? TaskExtension { get; set; }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) =>
            targetMethod?.Name == nameof(IProcessReader.GetAltinnTaskExtension)
                ? TaskExtension
                : throw new NotImplementedException(targetMethod?.Name);
    }

    private sealed class FoundersSigneeProvider : ISigneeProvider
    {
        public string Id { get; init; } = "founders";

        public Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters) =>
            throw new NotImplementedException();
    }

    /// <summary>A task extension holding <paramref name="config"/>, deserialized as the runtime reads it.</summary>
    private static AltinnTaskExtension Deserialize(string config)
    {
        var serializer = new XmlSerializer(
            typeof(AltinnTaskExtension),
            new XmlRootAttribute("taskExtension") { Namespace = "http://altinn.no/process" }
        );
        var xml = $"""<altinn:taskExtension xmlns:altinn="http://altinn.no/process">{config}</altinn:taskExtension>""";
        using var reader = new StringReader(xml);
        return Assert.IsType<AltinnTaskExtension>(serializer.Deserialize(reader));
    }

    private static List<Diagnostic> Collect(string process)
    {
        var diagnostics = new List<Diagnostic>();
        TaskConfigurationUtils.CollectDiagnostics(
            ImmutableArray.Create<AdditionalText>(new InMemoryAdditionalText(ProcessPath, process)),
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }

    /// <summary>The text a diagnostic in process.bpmn points at.</summary>
    private static string Text(string process, Diagnostic diagnostic) =>
        process.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length);

    private static string EFormidlingTask(string settings) =>
        Task(
            "Task_Send",
            "eFormidling",
            $"<altinn:eFormidlingConfig>{settings}</altinn:eFormidlingConfig>",
            element: "bpmn:serviceTask"
        );

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

    private static string Process(params string[] elements) =>
        $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" xmlns:other="urn:other-tool" id="Definitions_1">
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
