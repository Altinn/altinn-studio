using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Models.App;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController.FileSync.PdfDataTypeRepairTests;

/// <summary>
/// Saving the process repairs the pdf data types it declares in apps that were built before Studio
/// registered them correctly. The repair edits a developer's own application metadata, so these tests
/// pin both what it adds and what it must leave alone.
/// </summary>
public class ApplicationMetadataFileSyncPdfDataTypeTests
    : DesignerEndpointsTestsBase<ApplicationMetadataFileSyncPdfDataTypeTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "empty-app";
    private const string Developer = "testUser";
    private const string ApplicationMetadataPath = "App/config/applicationmetadata.json";

    /// <summary>
    /// Declares a signing pdf on Task_2, a payment receipt pdf on Task_3, and a signing task without a
    /// pdf on Task_4.
    /// </summary>
    private const string ProcessWithPdfDataTypes = "App/config/process/process-with-pdf-data-types.bpmn";

    /// <summary>
    /// Declares nothing but data and confirmation tasks.
    /// </summary>
    private const string ProcessWithoutPdfDataTypes = "App/config/process/process.bpmn";

    private const string SigningPdfDataTypeId = "signing-pdf-1234";
    private const string PaymentReceiptPdfDataTypeId = "paymentReceiptPdf-1234";
    private const string PdfContentType = "application/pdf";

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/process-modelling/process-definition";

    public ApplicationMetadataFileSyncPdfDataTypeTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task UpsertProcessDefinition_WhenDeclaredPdfDataTypeIsUnregistered_RegistersItAcceptingPdf()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);

        ApplicationMetadata applicationMetadata = ReadApplicationMetadata(targetRepository);

        DataType signingPdf = applicationMetadata.DataTypes.Find(dataType => dataType.Id == SigningPdfDataTypeId);
        Assert.NotNull(signingPdf);
        Assert.Equal([PdfContentType], signingPdf.AllowedContentTypes);
        Assert.Equal("Task_2", signingPdf.TaskId);
        Assert.Equal(1, signingPdf.MaxCount);
        Assert.Equal(["app:owned"], signingPdf.AllowedContributors);

        DataType paymentReceiptPdf = applicationMetadata.DataTypes.Find(dataType =>
            dataType.Id == PaymentReceiptPdfDataTypeId
        );
        Assert.NotNull(paymentReceiptPdf);
        Assert.Equal([PdfContentType], paymentReceiptPdf.AllowedContentTypes);
        Assert.Equal("Task_3", paymentReceiptPdf.TaskId);

        // The app started with one data type, and only the two the process names were added. The signing
        // task on Task_4 names no pdf data type, so nothing was invented for it.
        Assert.Equal(3, applicationMetadata.DataTypes.Count);
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenDeclaredPdfDataTypeDoesNotAcceptPdf_AddsPdfAndKeepsTheRestOfTheEntry()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        await WriteApplicationMetadata(ApplicationMetadataWithMisconfiguredSigningPdf);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);

        ApplicationMetadata applicationMetadata = ReadApplicationMetadata(targetRepository);

        DataType signingPdf = applicationMetadata.DataTypes.Find(dataType => dataType.Id == SigningPdfDataTypeId);
        Assert.Equal(["application/json", PdfContentType], signingPdf.AllowedContentTypes);
        Assert.Equal(["app:owned", "org:owned"], signingPdf.AllowedContributors);
        Assert.Equal("SomeOtherTask", signingPdf.TaskId);
        Assert.Equal(7, signingPdf.MaxCount);
        Assert.Equal(3, signingPdf.MinCount);

        // The other declared entry was already correct, so the repair of this one left it as it was.
        DataType paymentReceiptPdf = applicationMetadata.DataTypes.Find(dataType =>
            dataType.Id == PaymentReceiptPdfDataTypeId
        );
        Assert.Equal([PdfContentType], paymentReceiptPdf.AllowedContentTypes);
        Assert.Equal(1, paymentReceiptPdf.MaxCount);

        // Both declared ids were already registered, so nothing was added.
        Assert.Equal(2, applicationMetadata.DataTypes.Count);
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenApplicationMetadataDeclaresNoDataTypes_RegistersTheDeclaredPdfDataTypes()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        await WriteApplicationMetadata(ApplicationMetadataWithoutDataTypes);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);

        ApplicationMetadata applicationMetadata = ReadApplicationMetadata(targetRepository);

        Assert.Equal(2, applicationMetadata.DataTypes.Count);
        Assert.Equal(
            [PdfContentType],
            applicationMetadata.DataTypes.Find(dataType => dataType.Id == SigningPdfDataTypeId).AllowedContentTypes
        );
        Assert.Equal(
            [PdfContentType],
            applicationMetadata
                .DataTypes.Find(dataType => dataType.Id == PaymentReceiptPdfDataTypeId)
                .AllowedContentTypes
        );
    }

    /// <summary>
    /// An entry listing no content types accepts every content type, so registering pdf on it would take
    /// away everything else it accepts. Losing the guard that spares such an entry is the only change to
    /// this handler that turns it destructive, and an entry says it accepts everything in two ways: with
    /// an empty list, which this test covers, and with no list at all, which the next one covers.
    /// </summary>
    [Fact]
    public async Task UpsertProcessDefinition_WhenDeclaredPdfDataTypeHasAnEmptyContentTypeList_LeavesApplicationMetadataUntouched()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        await WriteApplicationMetadata(ApplicationMetadataWithPdfDataTypesAcceptingAnyContentType);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);

        Assert.Equal(
            ApplicationMetadataWithPdfDataTypesAcceptingAnyContentType,
            ReadApplicationMetadataFile(targetRepository)
        );
    }

    /// <summary>
    /// The other shape of an entry that accepts everything: no content type list at all, which reaches the
    /// handler as null rather than as an empty list. Comparing the file cannot pin this one — narrowing a
    /// null list throws before anything is written, so the file is untouched for the wrong reason — which
    /// is why the metadata here also holds an entry that genuinely needs repairing. Finding that repair on
    /// disk is what says the handler got past the null entry instead of falling over it.
    /// </summary>
    [Fact]
    public async Task UpsertProcessDefinition_WhenDeclaredPdfDataTypeHasNoContentTypeList_RepairsTheOtherAndLeavesItAlone()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        await WriteApplicationMetadata(ApplicationMetadataWithPaymentPdfAcceptingAnyContentType);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);

        ApplicationMetadata applicationMetadata = ReadApplicationMetadata(targetRepository);

        DataType paymentReceiptPdf = applicationMetadata.DataTypes.Find(dataType =>
            dataType.Id == PaymentReceiptPdfDataTypeId
        );
        Assert.Null(paymentReceiptPdf.AllowedContentTypes);

        DataType signingPdf = applicationMetadata.DataTypes.Find(dataType => dataType.Id == SigningPdfDataTypeId);
        Assert.Equal(["application/json", PdfContentType], signingPdf.AllowedContentTypes);
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenSavedTwice_LeavesTheSameApplicationMetadataBehind()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);
        string applicationMetadataAfterFirstSave = ReadApplicationMetadataFile(targetRepository);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);

        // The entries the first save created are already what the repair would write, so the second save
        // has nothing to do and the file is not written again.
        Assert.Equal(applicationMetadataAfterFirstSave, ReadApplicationMetadataFile(targetRepository));
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenDeclaredPdfDataTypesAreAlreadyCorrect_LeavesApplicationMetadataUntouched()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        await WriteApplicationMetadata(ApplicationMetadataWithCorrectPdfDataTypes);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);

        Assert.Equal(ApplicationMetadataWithCorrectPdfDataTypes, ReadApplicationMetadataFile(targetRepository));
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenProcessDeclaresNoPdfDataType_LeavesApplicationMetadataUntouched()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        // Deliberately a file the handler would repair if the process named these ids, so this pins that
        // nothing at all is read or written when no task declares a pdf, rather than only that a repair
        // found nothing to do.
        await WriteApplicationMetadata(ApplicationMetadataWithMisconfiguredSigningPdf);

        await UpsertProcessDefinition(targetRepository, ProcessWithoutPdfDataTypes);

        Assert.Equal(ApplicationMetadataWithMisconfiguredSigningPdf, ReadApplicationMetadataFile(targetRepository));
    }

    private async Task UpsertProcessDefinition(string targetRepository, string bpmnFilePath)
    {
        string processContent = SharedResourcesHelper.LoadTestDataAsString(bpmnFilePath);
        using var processStream = new MemoryStream(Encoding.UTF8.GetBytes(processContent));

        using var form = new MultipartFormDataContent
        {
            { new StreamContent(processStream), "content", "process.bpmn" },
        };

        using var response = await HttpClient.PutAsync(VersionPrefix(Org, targetRepository), form);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    private static string ReadApplicationMetadataFile(string targetRepository) =>
        TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, ApplicationMetadataPath);

    private static ApplicationMetadata ReadApplicationMetadata(string targetRepository) =>
        JsonSerializer.Deserialize<ApplicationMetadata>(
            ReadApplicationMetadataFile(targetRepository),
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

    /// <summary>
    /// The sibling data type tests copy their application metadata in from a file with
    /// <c>AddFileToRepo</c>. These write it from a constant instead, deliberately: what each of these
    /// files is testing lives in one or two of its fields, and a constant keeps the explanation of those
    /// fields next to the test that depends on them rather than in a fixture a reader has to go and find.
    ///
    /// Every one of them is indented with four spaces and spaces its arrays out, neither of which the
    /// repository's own serializer writes. A test that compares the file to the constant afterwards
    /// therefore fails on any save at all, including one that wrote back the same values.
    /// </summary>
    private async Task WriteApplicationMetadata(string content) =>
        await File.WriteAllTextAsync(Path.Combine(TestRepoPath, ApplicationMetadataPath), content);

    /// <summary>
    /// The defect an app built before the fix carries: the entry exists, but accepts json rather than
    /// pdf. Every other field is one a developer could have chosen and the repair must not touch.
    /// </summary>
    private const string ApplicationMetadataWithMisconfiguredSigningPdf = """
        {
            "id": "ttd/empty-app",
            "org": "ttd",
            "dataTypes": [
                {
                    "id": "signing-pdf-1234",
                    "allowedContentTypes": [ "application/json" ],
                    "allowedContributors": [ "app:owned", "org:owned" ],
                    "taskId": "SomeOtherTask",
                    "maxCount": 7,
                    "minCount": 3
                },
                {
                    "id": "paymentReceiptPdf-1234",
                    "allowedContentTypes": [ "application/pdf" ],
                    "maxCount": 1
                }
            ]
        }
        """;

    /// <summary>
    /// Both declared data types are already registered as accepting pdf, so the handler has nothing to
    /// do. Indented with four spaces, which the repository's own serializer never writes, so any save at
    /// all — even one that changed no values — shows up as a difference in the file.
    /// </summary>
    private const string ApplicationMetadataWithCorrectPdfDataTypes = """
        {
            "id": "ttd/empty-app",
            "org": "ttd",
            "dataTypes": [
                {
                    "id": "signing-pdf-1234",
                    "allowedContentTypes": [ "application/pdf" ],
                    "maxCount": 1
                },
                {
                    "id": "paymentReceiptPdf-1234",
                    "allowedContentTypes": [ "application/pdf", "application/json" ],
                    "maxCount": 1
                }
            ]
        }
        """;

    /// <summary>
    /// Both declared data types list no content types, which the runtime reads as accepting any of them.
    /// Registering pdf here would leave the entries accepting pdf and nothing else, so the file must come
    /// back exactly as it went in.
    /// </summary>
    private const string ApplicationMetadataWithPdfDataTypesAcceptingAnyContentType = """
        {
            "id": "ttd/empty-app",
            "org": "ttd",
            "dataTypes": [
                {
                    "id": "signing-pdf-1234",
                    "allowedContentTypes": [],
                    "maxCount": 1
                },
                {
                    "id": "paymentReceiptPdf-1234",
                    "allowedContentTypes": [],
                    "maxCount": 1
                }
            ]
        }
        """;

    /// <summary>
    /// The payment receipt entry has no <c>allowedContentTypes</c> key at all, the other shape of an entry
    /// accepting anything. The signing entry accepts json only, so it is a repair the handler must still
    /// carry out while leaving the payment receipt entry alone.
    /// </summary>
    private const string ApplicationMetadataWithPaymentPdfAcceptingAnyContentType = """
        {
            "id": "ttd/empty-app",
            "org": "ttd",
            "dataTypes": [
                {
                    "id": "signing-pdf-1234",
                    "allowedContentTypes": [ "application/json" ],
                    "maxCount": 1
                },
                {
                    "id": "paymentReceiptPdf-1234",
                    "maxCount": 1
                }
            ]
        }
        """;

    /// <summary>
    /// No <c>dataTypes</c> key at all, which reaches the handler as a null list rather than an empty one.
    /// </summary>
    private const string ApplicationMetadataWithoutDataTypes = """
        {
            "id": "ttd/empty-app",
            "org": "ttd"
        }
        """;
}
