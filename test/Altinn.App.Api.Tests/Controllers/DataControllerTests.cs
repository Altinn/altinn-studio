using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class DataControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public DataControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task PutDataElement_MissingDataType_ReturnsBadRequest()
    {
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 1337;
        Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetServiceOwnerToken("405003309", org: "nav");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(org, app, instanceOwnerPartyId, guid);

        using var content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json"); // empty valid json
        var response = await client.PostAsync($"/{org}/{app}/instances/{instanceOwnerPartyId}/{guid}/data", content);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var responseContent = await response.Content.ReadAsStringAsync();
        responseContent.Should().Contain("dataType");
    }

    [Fact]
    public async Task PostBinaryElement_ContentTooLarge_ReturnsBadRequest()
    {
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 1337;
        string dataType = "specificFileType"; // Should have restrictions on 1 mb in app metadata
        Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetServiceOwnerToken("405003309", org: "nav");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        TestData.PrepareInstance(org, app, instanceOwnerPartyId, guid);

        using var content = new ByteArrayContent(new byte[1024 * 1024 + 1]); // 1 mb
        content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
        {
            FileName = "example.pdf",
        };
        var response = await client.PostAsync(
            $"/{org}/{app}/instances/{instanceOwnerPartyId}/{guid}/data/{dataType}",
            content
        );
        var responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        responseContent
            .Should()
            .Contain(
                """
                "code":"DataElementTooLarge","description":"Invalid data provided. Error: Binary attachment exceeds limit of 1048576","source":"DataRestrictionValidation"
                """
            );
    }

    [Fact]
    public async Task CreateDataElement_BinaryPdf_AnalyserShouldRunOk()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IFileAnalyser, MimeTypeAnalyserSuccessStub>();
            services.AddTransient<IFileValidator, MimeTypeValidatorStub>();
        };

        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
        TestData.PrepareInstance(org, app, 1337, guid);

        // Setup the request
        string token = TestAuthentication.GetServiceOwnerToken("405003309", org: "nav");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        ByteArrayContent fileContent = await CreateBinaryContent(org, app, "example.pdf", "application/pdf");
        string url = $"/{org}/{app}/instances/1337/{guid}/data?dataType=specificFileType";
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = fileContent };

        // This is where it happens
        HttpResponseMessage response = await client.SendAsync(request);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateDataElement_ZeroBytes_BinaryPdf_AnalyserShouldReturnBadRequest()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IFileAnalyser, MimeTypeAnalyserSuccessStub>();
            services.AddTransient<IFileValidator, MimeTypeValidatorStub>();
        };

        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
        TestData.PrepareInstance(org, app, 1337, guid);

        // Setup the request
        string token = TestAuthentication.GetServiceOwnerToken("405003309", org: "nav");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        ByteArrayContent fileContent = await CreateBinaryContent(org, app, "zero.pdf", "application/pdf");
        string url = $"/{org}/{app}/instances/1337/{guid}/data?dataType=specificFileType";
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = fileContent };

        // This is where it happens
        HttpResponseMessage response = await client.SendAsync(request);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        Assert.Equal("Invalid data provided. Error: The file is zero bytes.", responseContent);
    }

    [Fact]
    public async Task CreateDataElement_JpgFakedAsPdf_AnalyserShouldRunAndFail()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IFileAnalyser, MimeTypeAnalyserFailureStub>();
            services.AddTransient<IFileValidator, MimeTypeValidatorStub>();
        };

        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        Guid guid = new Guid("1fc98a23-fe31-4ef5-8fb9-dd3f479354ce");
        TestData.PrepareInstance(org, app, 1337, guid);

        // Setup the request
        string token = TestAuthentication.GetServiceOwnerToken("405003309", org: "nav");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        ByteArrayContent fileContent = await CreateBinaryContent(org, app, "example.jpg.pdf", "application/pdf");
        string url = $"/{org}/{app}/instances/1337/{guid}/data?dataType=specificFileType";
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = fileContent };

        // This is where it happens
        HttpResponseMessage response = await client.SendAsync(request);
        string responseContent = await response.Content.ReadAsStringAsync();

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static async Task<ByteArrayContent> CreateBinaryContent(
        string org,
        string app,
        string filename,
        string mediaType
    )
    {
        var pdfFilePath = TestData.GetAppSpecificTestdataFile(org, app, filename);
        var fileBytes = await File.ReadAllBytesAsync(pdfFilePath);
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(mediaType);
        fileContent.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse(
            $"attachment; filename=\"{filename}\"; filename*=UTF-8''{filename}"
        );
        return fileContent;
    }
}

public class MimeTypeAnalyserSuccessStub : IFileAnalyser
{
    public string Id { get; private set; } = "mimeTypeAnalyser";

    public Task<IEnumerable<FileAnalysisResult>> Analyse(IEnumerable<HttpContent> httpContents)
    {
        throw new NotImplementedException();
    }

    public Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null)
    {
        return Task.FromResult(
            new FileAnalysisResult(Id)
            {
                MimeType = "application/pdf",
                Filename = "example.pdf",
                Extensions = new List<string>() { "pdf" },
            }
        );
    }
}

public class MimeTypeAnalyserFailureStub : IFileAnalyser
{
    public string Id { get; private set; } = "mimeTypeAnalyser";

    public Task<IEnumerable<FileAnalysisResult>> Analyse(IEnumerable<HttpContent> httpContents)
    {
        throw new NotImplementedException();
    }

    public Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null)
    {
        return Task.FromResult(
            new FileAnalysisResult(Id)
            {
                MimeType = "application/jpeg",
                Filename = "example.jpg.pdf",
                Extensions = new List<string>() { "jpg" },
            }
        );
    }
}

public class MimeTypeValidatorStub : IFileValidator
{
    public string Id { get; private set; } = "mimeTypeValidator";

#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously. Suppressed because of the interface.
    public async Task<(bool Success, IEnumerable<ValidationIssue> Errors)> Validate(
        DataType dataType,
        IEnumerable<FileAnalysisResult> fileAnalysisResults
    )
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
    {
        List<ValidationIssue> errors = new();

        var fileMimeTypeResult = fileAnalysisResults.FirstOrDefault(x => x.MimeType != null);

        // Verify that file mime type is an allowed content-type
        if (
            !dataType.AllowedContentTypes.Contains(
                fileMimeTypeResult?.MimeType,
                StringComparer.InvariantCultureIgnoreCase
            ) && !dataType.AllowedContentTypes.Contains("application/octet-stream")
        )
        {
            ValidationIssue error = new()
            {
                Source = ValidationIssueSources.File,
                Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                Severity = ValidationIssueSeverity.Error,
                Description =
                    $"The {fileMimeTypeResult?.Filename + " "}file does not appear to be of the allowed content type according to the configuration for data type {dataType.Id}. Allowed content types are {string.Join(", ", dataType.AllowedContentTypes)}",
            };

            errors.Add(error);

            return (false, errors);
        }

        return (true, errors);
    }
}
