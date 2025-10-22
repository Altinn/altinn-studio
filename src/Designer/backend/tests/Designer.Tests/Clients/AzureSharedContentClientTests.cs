#nullable enable
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Implementations;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.SharedContent;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using VerifyXunit;
using Xunit;



namespace Designer.Tests.Clients;

public class AzureSharedContentClientTests
{
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        AllowTrailingCommas = true
    };

    [Fact]
    public void CombineWithDelimiter()
    {
        // Arrange
        string firstParam = "first";
        string secondParam = "second";
        string thirdParam = "third";
        string expected = "first/second/third";

        // Act
        string result = AzureSharedContentClient.CombineWithDelimiter(firstParam, secondParam, thirdParam);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void JsonFileName()
    {
        // Arrange
        string fileName = "someFileName";
        string expected = "someFileName.json";

        // Act
        string result = AzureSharedContentClient.JsonFileName(fileName);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void SetCurrentVersion()
    {
        // Arrange
        List<string> versionPrefixes = ["ttd/code_lists/countries/1.json", "ttd/code_lists/countries/2.json"];
        string expected = "3";
        AzureSharedContentClient client = GetClientForTest();

        // Act
        client.SetCurrentVersion(versionPrefixes);

        // Assert
        Assert.Equal(expected, client.CurrentVersion);
    }

    [Fact]
    public void SetCurrentVersion_EmptyInputList()
    {
        // Arrange
        List<string> versionPrefixes = [];
        string expected = "1";
        AzureSharedContentClient client = GetClientForTest();

        // Act
        client.SetCurrentVersion(versionPrefixes);

        // Assert
        Assert.Equal(expected, client.CurrentVersion);
    }

    [Fact]
    public void AddIndexFile()
    {
        // Arrange
        string indexPath = "ttd/_index.json";
        string prefix = "ttd/code_lists";
        List<string> prefixes = [prefix];
        string expected = "{\r\n  \"prefixes\": [\r\n    \"ttd/code_lists\"\r\n  ]\r\n}";
        AzureSharedContentClient client = GetClientForTest();

        // Act
        client.AddIndexFile(indexPath, prefixes);

        // Assert
        Assert.NotEmpty(client.FileNamesAndContent);
        Assert.Equal(expected, client.FileNamesAndContent[indexPath]);
    }

    [Fact]
    public async Task CreateCodeListFiles()
    {
        // Arrange
        CodeList codeList = SetupCodeList();
        string codeListFolderPath = "ttd/code_lists/countries";
        string versionPrefix = "ttd/code_lists";
        AzureSharedContentClient client = GetClientForTest();

        // Act
        client.CreateCodeListFiles(codeList, codeListFolderPath, versionPrefix);

        // Assert
        Assert.NotEmpty(client.FileNamesAndContent);
        await Verifier.Verify(client.FileNamesAndContent);
    }

    [Fact]
    public async Task ThrowIfUnhealthy_ThrowsIfUnhealthy()
    {
        // Arrange
        Mock<BlobContainerClient> mock = new(behavior: MockBehavior.Strict);
        mock.Setup(c => c.ExistsAsync(CancellationToken.None)).Throws<AggregateException>();
        AzureSharedContentClient client = GetClientForTest();

        // Act & Assert
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.ThrowIfUnhealthy(mock.Object));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mock.Verify();
    }

    [Fact]
    public async Task PrepareBlobTasks()
    {
        // Arrange
        Mock<BlobClient> blobClientMock = new();
        Mock<BlobContainerClient> containerClientMock = new();
        blobClientMock
            .Setup(c => c.UploadAsync(It.IsAny<BinaryData>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()));
        containerClientMock.Setup(c => c.GetBlobClient(It.IsAny<string>())).Returns(blobClientMock.Object);
        AzureSharedContentClient client = GetClientForTest();
        string content = "content";
        client.FileNamesAndContent["ttd/code_lists/someCodeList/1.json"] = content;

        // Act
        List<Task> result = client.PrepareBlobTasks(containerClientMock.Object);

        // Assert
        await Assert.Single(result);
        blobClientMock
            .Verify(c => c.UploadAsync(It.Is<BinaryData>(bd => bd.ToString() == content), true, It.IsAny<CancellationToken>()), Times.Once);
        containerClientMock.Verify();
    }

    [Fact]
    public void PrepareBlobTasks_EmptyFileNamesAndContentList()
    {
        // Arrange
        Mock<BlobContainerClient> mock = new();
        AzureSharedContentClient client = GetClientForTest();

        // Act
        List<Task> result = client.PrepareBlobTasks(mock.Object);

        // Assert
        Assert.Empty(result);
        mock.Verify();
    }

    [Fact]
    public async Task HandleVersionIndex()
    {
        // Arrange
        string prefix = "ttd/code_lists/countries";
        IndexFile indexFile = new(Prefixes: [$"{prefix}/1.json"]);
        string content = JsonSerializer.Serialize(indexFile, s_jsonOptions);

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
                )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK, Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleVersionIndex(prefix);

        // Assert
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal("2", client.CurrentVersion);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleVersionIndex_NoExistingVersions()
    {
        // Arrange
        string prefix = "ttd/code_lists/countries";

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK, Content = null
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleVersionIndex(prefix);

        // Assert
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal("1", client.CurrentVersion);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleVersionIndex_NotFoundResponse()
    {
        // Arrange
        string prefix = "ttd/code_lists/countries";

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.NotFound
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleVersionIndex(prefix);

        // Assert
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal("1", client.CurrentVersion);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleVersionIndex_OtherResponse()
    {
        // Arrange
        string prefix = "ttd/code_lists/countries";

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest, Content = null
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act & Assert
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.HandleVersionIndex(prefix));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleResourceIndex()
    {
        // Arrange
        string prefix = "ttd/code_lists";
        string resourceId = "newCodeList";
        IndexFile indexFile = new(Prefixes: [$"{prefix}/cities"]);
        string content = JsonSerializer.Serialize(indexFile, s_jsonOptions);
        indexFile.Prefixes.Add($"{prefix}/{resourceId}");
        string expectedContent = JsonSerializer.Serialize(indexFile, s_jsonOptions);

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK, Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleResourceIndex(prefix, resourceId);

        // Assert
        string path = $"{prefix}/_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleResourceIndex_NotFoundResponse()
    {
        // Arrange
        string prefix = "ttd/code_lists";
        string resourceId = "countries";
        IndexFile indexFile = new(Prefixes: [$"{prefix}/{resourceId}"]);
        string expectedContent = JsonSerializer.Serialize(indexFile, s_jsonOptions);

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.NotFound
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleResourceIndex(prefix, resourceId);

        // Assert
        string path = $"{prefix}/_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleResourceIndex_OtherResponse()
    {
        // Arrange
        string prefix = "ttd/code_lists";
        string resourceId = "countries";

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act & Assert
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.HandleResourceIndex(prefix, resourceId));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleResourceTypeIndex()
    {
        // Arrange
        string prefix = "ttd";
        string resourceType = "new_resource_type";
        IndexFile indexFile = new(Prefixes: [$"{prefix}/code_lists"]);
        string content = JsonSerializer.Serialize(indexFile, s_jsonOptions);
        indexFile.Prefixes.Add($"{prefix}/{resourceType}");
        string expectedContent = JsonSerializer.Serialize(indexFile, s_jsonOptions);

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK, Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleResourceIndex(prefix, resourceType);

        // Assert
        string path = $"{prefix}/_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleResourceTypeIndex_NotFoundResponse()
    {
        // Arrange
        string prefix = "ttd/code_lists";
        string resourceType = "code_lists";
        IndexFile indexFile = new(Prefixes: [$"{prefix}/{resourceType}"]);
        string expectedContent = JsonSerializer.Serialize(indexFile, s_jsonOptions);

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.NotFound
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleResourceTypeIndex(prefix, resourceType);

        // Assert
        string path = $"{prefix}/_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleResourceTypeIndex_OtherResponse()
    {
        // Arrange
        string prefix = "ttd";
        string resourceType = "code_lists";

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act & Assert
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.HandleResourceTypeIndex(prefix, resourceType));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleOrganizationIndex()
    {
        // Arrange
        string organization = "new_organization";
        IndexFile indexFile = new(Prefixes: ["ttd"]);
        string content = JsonSerializer.Serialize(indexFile, s_jsonOptions);
        indexFile.Prefixes.Add($"{organization}");
        string expectedContent = JsonSerializer.Serialize(indexFile, s_jsonOptions);

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK, Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleOrganizationIndex(organization);

        // Assert
        string path = "_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleOrganizationIndex_NotFoundResponse()
    {
        // Arrange
        string organization = "new_organization";
        IndexFile indexFile = new(Prefixes: [organization]);
        string expectedContent = JsonSerializer.Serialize(indexFile, s_jsonOptions);

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.NotFound
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.HandleOrganizationIndex(organization);

        // Assert
        string path = "_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task HandleOrganizationIndex_OtherResponse()
    {
        // Arrange
        string organizationName = "ttd";

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);
        mockHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act & Assert
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.HandleOrganizationIndex(organizationName));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mockHandler.VerifyAll();
    }








    private static CodeList SetupCodeList()
    {
        Dictionary<string, string> label = new() { { "nb", "tekst" }, { "en", "text" } };
        Dictionary<string, string> description = new() { { "nb", "Dette er en tekst" }, { "en", "This is a text" } };
        Dictionary<string, string> helpText = new() { { "nb", "Velg dette valget for å få en tekst" }, { "en", "Choose this option to get a text" } };
        List<Code> listOfCodes =
        [
            new(
                Value: "value1",
                Label: label,
                Description: description,
                HelpText: helpText,
                Tags: ["test-data"]
            )
        ];
        CodeListSource source = new(Name: "test-data-files");
        return new CodeList(
            Source: source,
            Codes: listOfCodes,
            TagNames: ["test-data-category"]
        );
    }

    private static AzureSharedContentClient GetClientForTest(HttpClient? httpClient = null)
    {
        Mock<HttpClient> httpClientMock = new();
        Mock<ILogger<AzureSharedContentClient>> logger = new();
        Mock<IOptions<SharedContentClientSettings>> settingsMock = new();
        SharedContentClientSettings settings = new() { StorageAccountUrl = "http://test.no", StorageContainerName = "storageAccountName" };
        settingsMock.Setup(iOptions => iOptions.Value).Returns(settings);

        return new AzureSharedContentClient(httpClient ?? httpClientMock.Object, logger.Object, settingsMock.Object);
    }
}
