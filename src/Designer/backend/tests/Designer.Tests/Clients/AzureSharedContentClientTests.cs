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
using Altinn.Studio.Designer.Exceptions.SharedContent;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.SharedContent;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Language.Flow;
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
    public void CombineWithDelimiter_Nulls()
    {
        // Arrange
        string? firstParam = null;
        string? secondParam = null;
        string expected = "";

        // Act
        string result = AzureSharedContentClient.CombineWithDelimiter(firstParam, secondParam);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void CombineWithDelimiter_LeftNull()
    {
        // Arrange
        string? firstParam = null;
        string? secondParam = "second";
        string expected = "second";

        // Act
        string result = AzureSharedContentClient.CombineWithDelimiter(firstParam, secondParam);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void CombineWithDelimiter_RightNull()
    {
        // Arrange
        string? firstParam = "first";
        string? secondParam = null;
        string expected = "first";

        // Act
        string result = AzureSharedContentClient.CombineWithDelimiter(firstParam, secondParam);

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
    public async Task AddIndexFile()
    {
        // Arrange
        string indexPath = "ttd/_index.json";
        string prefix = "ttd/code_lists";
        List<string> prefixes = [prefix];
        AzureSharedContentClient client = GetClientForTest();

        // Act
        client.AddIndexFile(indexPath, prefixes);

        // Assert
        Assert.NotEmpty(client.FileNamesAndContent);
        await Verifier.Verify(client.FileNamesAndContent);
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
    public async Task UploadBlobs()
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
        await client.UploadBlobs(containerClientMock.Object);

        // Assert
        blobClientMock
            .Verify(c => c.UploadAsync(It.Is<BinaryData>(bd => bd.ToString() == content), true, It.IsAny<CancellationToken>()), Times.Once);
        containerClientMock.Verify(c => c.GetBlobClient("ttd/code_lists/someCodeList/1.json"), Times.Once);
    }

    [Fact]
    public async Task PrepareVersionIndexFile()
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
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.PrepareVersionIndexFile(prefix);

        // Assert
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal("2", client.CurrentVersion);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareVersionIndexFile_NoExistingVersions()
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
                StatusCode = HttpStatusCode.OK,
                Content = null
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.PrepareVersionIndexFile(prefix);

        // Assert
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal("1", client.CurrentVersion);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareVersionIndexFile_NotFoundResponse()
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
        await client.PrepareVersionIndexFile(prefix);

        // Assert
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal("1", client.CurrentVersion);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareVersionIndexFile_OtherResponse()
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
                StatusCode = HttpStatusCode.BadRequest,
                Content = null
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act & Assert
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.PrepareVersionIndexFile(prefix));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareResourceIndexFile()
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
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.PrepareResourceIndexFile(prefix, resourceId);

        // Assert
        string path = $"{prefix}/_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareResourceIndexFile_NotFoundResponse()
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
        await client.PrepareResourceIndexFile(prefix, resourceId);

        // Assert
        string path = $"{prefix}/_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareResourceIndexFile_OtherResponse()
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
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.PrepareResourceIndexFile(prefix, resourceId));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareResourceTypeIndexFile()
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
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.PrepareResourceTypeIndexFile(prefix, resourceType);

        // Assert
        string path = $"{prefix}/_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareResourceTypeIndexFile_NotFoundResponse()
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
        await client.PrepareResourceTypeIndexFile(prefix, resourceType);

        // Assert
        string path = $"{prefix}/_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareResourceTypeIndexFile_OtherResponse()
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
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.PrepareResourceTypeIndexFile(prefix, resourceType));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareOrganisationIndexFile()
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
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json)
            });
        HttpClient httpClient = new(mockHandler.Object);
        AzureSharedContentClient client = GetClientForTest(httpClient);

        // Act
        await client.PrepareOrganisationIndexFile(organization);

        // Assert
        string path = "_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareOrganisationIndexFile_NotFoundResponse()
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
        await client.PrepareOrganisationIndexFile(organization);

        // Assert
        string path = "_index.json";
        Assert.Single(client.FileNamesAndContent);
        Assert.Equal(expectedContent, client.FileNamesAndContent[path]);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PrepareOrganisationIndexFile_OtherResponse()
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
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(async () => await client.PrepareOrganisationIndexFile(organizationName));
        Assert.Equal($"Request failed, class: {nameof(AzureSharedContentClient)}", exception.Message);
        mockHandler.VerifyAll();
    }

    [Fact]
    public async Task PublishCodeList_ReturnsCurrentVersion()
    {
        // Arrange
        string orgName = "ttd";
        string codeListId = "countries";
        CodeList codeList = SetupCodeList();

        IndexFile orgIndexFile = new(Prefixes: [orgName]);
        IndexFile resourceTypeIndexFile = new(Prefixes: [$"{orgName}/code_lists"]);
        IndexFile resourceIndexFile = new(Prefixes: [$"{orgName}/code_lists/{codeListId}"]);
        IndexFile versionIndexFile = new(Prefixes: [$"{orgName}/code_lists/{codeListId}/1.json"]);

        string orgContent = JsonSerializer.Serialize(orgIndexFile, s_jsonOptions);
        string resourceTypeContent = JsonSerializer.Serialize(resourceTypeIndexFile, s_jsonOptions);
        string resourceContent = JsonSerializer.Serialize(resourceIndexFile, s_jsonOptions);
        string versionContent = JsonSerializer.Serialize(versionIndexFile, s_jsonOptions);

        Mock<HttpMessageHandler> mockHandler = new(behavior: MockBehavior.Strict);

        // Arrange - Setup sequence of responses for the four index files
        mockHandler
            .Protected()
            .SetupSequence<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(orgContent, Encoding.UTF8, MediaTypeNames.Application.Json)
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(resourceTypeContent, Encoding.UTF8, MediaTypeNames.Application.Json)
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(resourceContent, Encoding.UTF8, MediaTypeNames.Application.Json)
            })
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(versionContent, Encoding.UTF8, MediaTypeNames.Application.Json)
            });

        HttpClient httpClient = new(mockHandler.Object);

        // Mock the blob container client
        Mock<BlobClient> blobClientMock = new();
        Mock<BlobContainerClient> containerClientMock = new();
        Mock<IBlobContainerClientFactory> factoryMock = new();

        blobClientMock
            .Setup(c => c.UploadAsync(It.IsAny<BinaryData>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Mock.Of<Azure.Response<Azure.Storage.Blobs.Models.BlobContentInfo>>());

        containerClientMock
            .Setup(c => c.GetBlobClient(It.IsAny<string>()))
            .Returns(blobClientMock.Object);

        containerClientMock
            .Setup(c => c.ExistsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Azure.Response.FromValue(true, Mock.Of<Azure.Response>()));

        factoryMock
            .Setup(f => f.GetContainerClient())
            .Returns(containerClientMock.Object);

        AzureSharedContentClient client = GetClientForTest(httpClient, factoryMock.Object);

        // Act
        string result = await client.PublishCodeList(orgName, codeListId, codeList);

        // Assert
        Assert.Equal("2", result);
        mockHandler.VerifyAll();
        factoryMock.Verify(f => f.GetContainerClient(), Times.Once);
        containerClientMock.Verify(c => c.ExistsAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPublishedResourcesForOrg_WithoutPath()
    {
        // Arrange
        string orgName = "ttd";
        string blobName1 = "blob1";
        string blobName2 = "blob2";
        string blobsPrefix = $"{orgName}/";

        List<BlobItem> blobItemsMock = [
            BlobsModelFactory.BlobItem($"{orgName}/{blobName1}"),
            BlobsModelFactory.BlobItem($"{orgName}/{blobName2}")
        ];

        Mock<BlobContainerClient> containerClientMock = new();
        containerClientMock
            .SetupGetBlobsAsync(blobsPrefix)
            .ReturnsPageableFrom(blobItemsMock);
        AzureSharedContentClient client = AzureClientWithContainerClient(containerClientMock);

        // Act
        List<string> publishedResources = await client.GetPublishedResourcesForOrg(orgName);

        // Assert
        containerClientMock.VerifyGetBlobsAsyncWasCalledOnce();
        containerClientMock.VerifyGetBlobsAsyncWasCalledWithExpectedParameters(blobsPrefix);
        Assert.Equal([blobName1, blobName2], publishedResources);
    }

    [Fact]
    public async Task GetPublishedResourcesForOrg_WithPath()
    {
        // Arrange
        string orgName = "ttd";
        string path = "some/path";
        string blobName1 = "blob1";
        string blobName2 = "blob2";
        string blobsPrefix = $"{orgName}/{path}";

        List<BlobItem> blobItemsMock = [
            BlobsModelFactory.BlobItem($"{orgName}/{path}/{blobName1}"),
            BlobsModelFactory.BlobItem($"{orgName}/{path}/{blobName2}")
        ];

        Mock<BlobContainerClient> containerClientMock = new();
        containerClientMock
            .SetupGetBlobsAsync(blobsPrefix)
            .ReturnsPageableFrom(blobItemsMock);
        AzureSharedContentClient client = AzureClientWithContainerClient(containerClientMock);

        // Act
        List<string> publishedResources = await client.GetPublishedResourcesForOrg(orgName, path);

        // Assert
        containerClientMock.VerifyGetBlobsAsyncWasCalledOnce();
        containerClientMock.VerifyGetBlobsAsyncWasCalledWithExpectedParameters(blobsPrefix);
        Assert.Equal([blobName1, blobName2], publishedResources);
    }

    [Fact]
    public async Task GetPublishedResourcesForOrg_ThrowsSharedContentRequestError()
    {
        // Arrange
        string orgName = "ttd";
        string errorMessage = "Lorem ipsum dolor sit amet.";

        Mock<BlobContainerClient> containerClientMock = new();
        containerClientMock
            .SetupGetBlobsAsync(orgName + "/")
            .Throws(() => new RequestFailedException(errorMessage));
        AzureSharedContentClient client = AzureClientWithContainerClient(containerClientMock);

        // Act and assert
        SharedContentRequestException exception = await Assert.ThrowsAsync<SharedContentRequestException>(
            async () => await client.GetPublishedResourcesForOrg(orgName)
        );
        Assert.NotNull(exception.InnerException);
        Assert.IsType<RequestFailedException>(exception.InnerException);
        Assert.Contains(orgName, exception.Message);
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

    private static AzureSharedContentClient GetClientForTest(HttpClient? httpClient = null, IBlobContainerClientFactory? blobContainerClientFactory = null)
    {
        Mock<HttpClient> httpClientMock = new();
        Mock<ILogger<AzureSharedContentClient>> logger = new();
        SharedContentClientSettings settings = new() { StorageAccountUrl = "http://test.no", StorageContainerName = "storageAccountName" };

        if (blobContainerClientFactory == null)
        {
            Mock<BlobContainerClient> containerClientMock = new();
            Mock<IBlobContainerClientFactory> factoryMock = new();
            factoryMock.Setup(f => f.GetContainerClient()).Returns(containerClientMock.Object);
            blobContainerClientFactory = factoryMock.Object;
        }

        return new AzureSharedContentClient(httpClient ?? httpClientMock.Object, logger.Object, settings, blobContainerClientFactory);
    }

    private static AzureSharedContentClient AzureClientWithContainerClient(Mock<BlobContainerClient> containerClientMock)
    {
        Mock<IBlobContainerClientFactory> factoryMock = new();
        factoryMock
            .Setup(f => f.GetContainerClient())
            .Returns(containerClientMock.Object);
        return GetClientForTest(null, factoryMock.Object);
    }
}

internal static class ContainerClientMockExtensions
{
    public static ISetup<BlobContainerClient, AsyncPageable<BlobItem>> SetupGetBlobsAsync(
        this Mock<BlobContainerClient> containerClientMock,
        string prefix
    )
    {
        return containerClientMock.Setup(
            c => c.GetBlobsAsync(
                It.IsAny<BlobTraits>(),
                It.IsAny<BlobStates>(),
                prefix,
                It.IsAny<CancellationToken>()
            )
        );
    }

    public static void ReturnsPageableFrom(
        this ISetup<BlobContainerClient, AsyncPageable<BlobItem>> setup,
        List<BlobItem> blobItems
    )
    {
        setup.Returns(() => AsyncPageable<BlobItem>.FromPages(
            [Page<BlobItem>.FromValues(blobItems, null, Mock.Of<Response>())]
        ));
    }

    public static void VerifyGetBlobsAsyncWasCalledOnce(this Mock<BlobContainerClient> containerClientMock)
    {
        containerClientMock.Verify(
            c => c.GetBlobsAsync(
                It.IsAny<BlobTraits>(),
                It.IsAny<BlobStates>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()
            ),
            Times.Once
        );
    }

    public static void VerifyGetBlobsAsyncWasCalledWithExpectedParameters(
        this Mock<BlobContainerClient> containerClientMock,
        string expectedPrefix
    )
    {
        containerClientMock.Verify(
            c => c.GetBlobsAsync(
                BlobTraits.None,
                BlobStates.None,
                expectedPrefix,
                default
            )
        );
    }
}
