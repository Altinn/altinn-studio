using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivInstanceClientTest
{
    private readonly InstanceIdentifier _defaultInstanceIdentifier = new($"12345/{Guid.NewGuid()}");

    [Fact]
    public async Task GetServiceOwnerToken_CallsTokenResolver()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
        });

        // Act
        var result = await fixture.FiksArkivInstanceClient.GetServiceOwnerToken();

        // Assert
        Assert.Equal(TestHelpers.DummyToken, result.Value);
    }

    [Fact]
    public async Task GetInstance_ReturnsInstance_ForValidResponse()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var instance = new Instance { Id = _defaultInstanceIdentifier.ToString() };
        List<HttpRequestMessage> requests = [];
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(
            HttpStatusCode.OK,
            contentFactory: _ => JsonSerializer.Serialize(instance),
            requestCallback: request => requests.Add(request)
        );
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        var result = await fixture.FiksArkivInstanceClient.GetInstance(_defaultInstanceIdentifier);

        // Assert
        Assert.Equal(instance.Id, result.Id);

        HttpRequestMessage instanceRequest = requests.Last();
        Assert.Equal(instanceRequest.Method, HttpMethod.Get);
        Assert.Equal($"Bearer {TestHelpers.DummyToken}", instanceRequest.Headers.Authorization!.ToString());
        Assert.Equal(
            $"http://localhost:5101/storage/api/v1/instances/{_defaultInstanceIdentifier}",
            instanceRequest.RequestUri!.ToString()
        );
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError, null)]
    [InlineData(HttpStatusCode.OK, "invalid-json")]
    public async Task GetInstance_ThrowsException_ForInvalidResponse(HttpStatusCode statusCode, string? content)
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(statusCode, contentFactory: _ => content);
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivInstanceClient.GetInstance(_defaultInstanceIdentifier)
        );

        // Assert
        Assert.IsType<PlatformHttpException>(record);
        Assert.Equal(statusCode, ((PlatformHttpException)record).Response.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("some-action")]
    public async Task ProcessMoveNext_CallsCorrectEndpoint(string? action)
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var appMetadata = await fixture.AppMetadata.GetApplicationMetadata();
        var expectedPayload = action is null
            ? ""
            : $$"""
                {"Action":"{{action}}","ActionOnBehalfOf":null}
                """;

        List<CapturedHttpRequest<string>> requests = [];
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(
            HttpStatusCode.OK,
            requestCallback: request =>
                requests.Add(new CapturedHttpRequest<string>(request, GetRequestContent(request.Content).Result))
        );
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        await fixture.FiksArkivInstanceClient.ProcessMoveNext(_defaultInstanceIdentifier, action);

        // Assert
        CapturedHttpRequest<string> processNextRequest = requests.Last();

        Assert.True(action is null ? expectedPayload == string.Empty : expectedPayload.Contains(action));
        Assert.True(expectedPayload == processNextRequest.Content);

        Assert.Equal(HttpMethod.Put, processNextRequest.Request.Method);
        Assert.Equal($"Bearer {TestHelpers.DummyToken}", processNextRequest.Request.Headers.Authorization!.ToString());
        Assert.Equal(
            $"http://local.altinn.cloud/{appMetadata.AppIdentifier}/instances/{_defaultInstanceIdentifier}/process/next",
            processNextRequest.Request.RequestUri!.ToString()
        );
    }

    [Fact]
    public async Task ProcessMoveNext_ThrowsException_ForInvalidResponse()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(HttpStatusCode.Forbidden);
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivInstanceClient.ProcessMoveNext(_defaultInstanceIdentifier)
        );

        // Assert
        Assert.IsType<PlatformHttpException>(record);
        Assert.Equal(HttpStatusCode.Forbidden, ((PlatformHttpException)record).Response.StatusCode);
    }

    [Fact]
    public async Task MarkInstanceComplete_CallsCorrectEndpoint()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        List<HttpRequestMessage> requests = [];
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(
            HttpStatusCode.OK,
            requestCallback: request => requests.Add(request)
        );
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        await fixture.FiksArkivInstanceClient.MarkInstanceComplete(_defaultInstanceIdentifier);

        // Assert
        HttpRequestMessage markCompletedRequest = requests.Last();

        Assert.Equal(HttpMethod.Post, markCompletedRequest.Method);
        Assert.Equal($"Bearer {TestHelpers.DummyToken}", markCompletedRequest.Headers.Authorization!.ToString());
        Assert.Equal(
            $"http://localhost:5101/storage/api/v1/instances/{_defaultInstanceIdentifier}/complete",
            markCompletedRequest.RequestUri!.ToString()
        );
    }

    [Fact]
    public async Task MarkInstanceComplete_ThrowsException_ForInvalidResponse()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(HttpStatusCode.Forbidden);
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivInstanceClient.MarkInstanceComplete(_defaultInstanceIdentifier)
        );

        // Assert
        Assert.IsType<PlatformHttpException>(record);
        Assert.Equal(HttpStatusCode.Forbidden, ((PlatformHttpException)record).Response.StatusCode);
    }

    [Fact]
    public async Task DeleteBinaryData_CallsCorrectEndpoint()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        Guid dataElementGuid = Guid.NewGuid();
        List<HttpRequestMessage> requests = [];
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(
            HttpStatusCode.OK,
            requestCallback: request => requests.Add(request)
        );
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        await fixture.FiksArkivInstanceClient.DeleteBinaryData(_defaultInstanceIdentifier, dataElementGuid);

        // Assert
        HttpRequestMessage deleteRequest = requests.Last();

        Assert.Equal(HttpMethod.Delete, deleteRequest.Method);
        Assert.Equal($"Bearer {TestHelpers.DummyToken}", deleteRequest.Headers.Authorization!.ToString());
        Assert.Equal(
            $"http://localhost:5101/storage/api/v1/instances/{_defaultInstanceIdentifier}/data/{dataElementGuid}",
            deleteRequest.RequestUri!.ToString()
        );
    }

    [Fact]
    public async Task DeleteBinaryData_ThrowsException_ForInvalidResponse()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(HttpStatusCode.Forbidden);
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivInstanceClient.DeleteBinaryData(_defaultInstanceIdentifier, Guid.NewGuid())
        );

        // Assert
        Assert.IsType<PlatformHttpException>(record);
        Assert.Equal(HttpStatusCode.Forbidden, ((PlatformHttpException)record).Response.StatusCode);
    }

    [Fact]
    public async Task InsertBinaryData_CallsCorrectEndpoint_WithCorrectPayload()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var data = "test content"u8.ToArray();
        var dataStream = new MemoryStream(data);
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "some-data-type",
            ContentType = "text/plain",
            Filename = "filename.txt",
        };

        List<CapturedHttpRequest<byte[]>> requests = [];
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(
            HttpStatusCode.OK,
            contentFactory: _ => JsonSerializer.Serialize(dataElement),
            requestCallback: request =>
                requests.Add(
                    new CapturedHttpRequest<byte[]>(
                        request,
                        request.Content?.ReadAsByteArrayAsync().Result,
                        request.Content?.Headers
                    )
                )
        );
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        var result = await fixture.FiksArkivInstanceClient.InsertBinaryData(
            _defaultInstanceIdentifier,
            dataElement.DataType,
            dataElement.ContentType,
            dataElement.Filename,
            dataStream
        );

        // Assert
        Assert.NotNull(result);
        Assert.Equal(dataElement.Id, result.Id);
        Assert.Equal(dataElement.DataType, result.DataType);
        Assert.Equal(dataElement.ContentType, result.ContentType);
        Assert.Equal(dataElement.Filename, result.Filename);
        Assert.True(dataStream.CanRead);

        var insertBinaryDataRequest = requests.Last();
        Assert.Equal(HttpMethod.Post, insertBinaryDataRequest.Request.Method);
        Assert.Equal(dataElement.ContentType, insertBinaryDataRequest.ContentHeaders!.ContentType?.MediaType);
        Assert.Equal(dataElement.Filename, insertBinaryDataRequest.ContentHeaders.ContentDisposition?.FileName);
        Assert.Equal(data, insertBinaryDataRequest.Content);
        Assert.Equal(
            $"Bearer {TestHelpers.DummyToken}",
            insertBinaryDataRequest.Request.Headers.Authorization!.ToString()
        );
        Assert.Equal(
            $"http://localhost:5101/storage/api/v1/instances/{_defaultInstanceIdentifier}/data?dataType={dataElement.DataType}",
            insertBinaryDataRequest.Request.RequestUri!.ToString()
        );
    }

    [Theory]
    [InlineData("", "", "", HttpStatusCode.OK, typeof(FiksArkivException))]
    [InlineData(null, null, null, HttpStatusCode.OK, typeof(FiksArkivException))]
    [InlineData("abc", "abc", "abc", HttpStatusCode.OK, typeof(FiksArkivException))]
    [InlineData("abc", "abc/def", "abc", HttpStatusCode.Forbidden, typeof(PlatformHttpException))]
    public async Task InsertBinaryData_ThrowsException_ForInvalidRequestOrResponse(
        string? dataType,
        string? contentType,
        string? filename,
        HttpStatusCode statusCode,
        Type expectedExceptionType
    )
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksArkiv());
        var httpClient = TestHelpers.GetHttpClientWithMockedHandlerFactory(statusCode);
        fixture.HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivInstanceClient.InsertBinaryData(
                _defaultInstanceIdentifier,
                dataType!,
                contentType!,
                filename!,
                Stream.Null
            )
        );

        // Assert
        Assert.IsType(expectedExceptionType, record);
        if (record is PlatformHttpException ex)
            Assert.Equal(statusCode, ex.Response.StatusCode);
    }

    private static async Task<string> GetRequestContent(HttpContent? potentialContent)
    {
        return potentialContent is not null ? await potentialContent.ReadAsStringAsync() : string.Empty;
    }

    private sealed record CapturedHttpRequest<TContent>(
        HttpRequestMessage Request,
        TContent? Content = default,
        HttpContentHeaders? ContentHeaders = null
    );
}
