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
/// Saving the process registers the pdf data types it declares as accepting pdf, and leaves everything else in
/// the application metadata alone.
/// </summary>
public class ApplicationMetadataFileSyncPdfDataTypeTests
    : DesignerEndpointsTestsBase<ApplicationMetadataFileSyncPdfDataTypeTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "empty-app";
    private const string Developer = "testUser";
    private const string ApplicationMetadataPath = "App/config/applicationmetadata.json";

    // Signing pdf on Task_2, payment receipt pdf on Task_3, signing without a pdf on Task_4
    private const string ProcessWithPdfDataTypes = "App/config/process/process-with-pdf-data-types.bpmn";

    // Task_2 and Task_3 both declare signing-pdf-1234
    private const string ProcessWithSharedPdfDataType = "App/config/process/process-with-shared-pdf-data-type.bpmn";

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

    [Fact]
    public async Task UpsertProcessDefinition_WhenDeclaredPdfDataTypeHasNoContentTypeList_RepairsTheOtherAndLeavesItAlone()
    {
        // The metadata also holds a repairable entry: finding that repair on disk shows the handler got past the
        // null list instead of throwing on it, which an unchanged file alone could not tell apart.
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
    public async Task UpsertProcessDefinition_WhenDeclaredPdfDataTypesAreAlreadyCorrect_LeavesApplicationMetadataUntouched()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);
        await WriteApplicationMetadata(ApplicationMetadataWithCorrectPdfDataTypes);

        await UpsertProcessDefinition(targetRepository, ProcessWithPdfDataTypes);

        Assert.Equal(ApplicationMetadataWithCorrectPdfDataTypes, ReadApplicationMetadataFile(targetRepository));
    }

    [Fact]
    public async Task UpsertProcessDefinition_WhenTwoTasksDeclareTheSamePdfDataType_RegistersItOnce()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, App, Developer, targetRepository);

        await UpsertProcessDefinition(targetRepository, ProcessWithSharedPdfDataType);

        ApplicationMetadata applicationMetadata = ReadApplicationMetadata(targetRepository);

        DataType signingPdf = Assert.Single(
            applicationMetadata.DataTypes,
            dataType => dataType.Id == SigningPdfDataTypeId
        );
        Assert.Equal([PdfContentType], signingPdf.AllowedContentTypes);
        Assert.Equal("Task_2", signingPdf.TaskId);
        Assert.Equal(2, applicationMetadata.DataTypes.Count);
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

    // The constants below use formatting the repository's serializer never writes, so any save shows up as a diff.
    private async Task WriteApplicationMetadata(string content) =>
        await File.WriteAllTextAsync(Path.Combine(TestRepoPath, ApplicationMetadataPath), content);

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
}
