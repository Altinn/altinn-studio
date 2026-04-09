using System.Net;
using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Moq;
using Moq.Protected;
using Newtonsoft.Json;

namespace Altinn.App.PlatformServices.Tests.Implementation;

public sealed class InstanceClientTests : IDisposable
{
    private readonly Mock<IOptions<PlatformSettings>> _platformSettingsOptions;
    private readonly Mock<HttpMessageHandler> _handlerMock = new(MockBehavior.Strict);
    private readonly Mock<IAuthenticationTokenResolver> _authenticationTokenResolver = new(MockBehavior.Strict);
    private readonly Mock<ILogger<InstanceClient>> _logger;
    private readonly TelemetrySink _telemetry;

    public InstanceClientTests()
    {
        _platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
        _logger = new Mock<ILogger<InstanceClient>>();
        _telemetry = new TelemetrySink();
    }

    [Fact]
    public async Task AddCompleteConfirmation_SuccessfulCallToStorage()
    {
        // Arrange
        Instance instance = new Instance
        {
            CompleteConfirmations = new List<CompleteConfirmation>
            {
                new CompleteConfirmation { StakeholderId = "test" },
            },
        };

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(instance), Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["complete"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        // Act
        await target.AddCompleteConfirmation(1337, Guid.NewGuid());

        // Assert
        _handlerMock.VerifyAll();

        await Verify(_telemetry.GetSnapshot());
    }

    [Fact]
    public async Task AddCompleteConfirmation_StorageReturnsNonSuccess_ThrowsPlatformHttpException()
    {
        // Arrange
        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.Forbidden,
            Content = new StringContent("Error message", Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["complete"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        PlatformHttpException? actualException = null;

        // Act
        try
        {
            await target.AddCompleteConfirmation(1337, Guid.NewGuid());
        }
        catch (PlatformHttpException e)
        {
            actualException = e;
        }

        // Assert
        _handlerMock.VerifyAll();

        Assert.NotNull(actualException);
    }

    [Fact]
    public async Task UpdateReadStatus_StorageReturnsNonSuccess_LogsErrorAppContinues()
    {
        // Arrange
        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.Forbidden,
            Content = new StringContent("Error message", Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["read"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        PlatformHttpException? actualException = null;

        // Act
        try
        {
            await target.UpdateReadStatus(1337, Guid.NewGuid(), "read");
        }
        catch (PlatformHttpException e)
        {
            actualException = e;
        }

        // Assert
        _handlerMock.VerifyAll();

        Assert.Null(actualException);
    }

    [Fact]
    public async Task UpdateReadStatus_StorageReturnsSuccess()
    {
        // Arrange
        Instance expected = new Instance { Status = new InstanceStatus { ReadStatus = ReadStatus.Read } };

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(expected), Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["read"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        // Act
        Instance actual = await target.UpdateReadStatus(1337, Guid.NewGuid(), "read");

        // Assert
        Assert.Equal(expected.Status.ReadStatus, actual.Status.ReadStatus);
        _handlerMock.VerifyAll();
    }

    [Fact]
    public async Task UpdateSubtatus_StorageReturnsSuccess()
    {
        // Arrange
        Instance expected = new Instance
        {
            Status = new InstanceStatus
            {
                Substatus = new Substatus { Label = "Substatus.Label", Description = "Substatus.Description" },
            },
        };

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(expected), Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["substatus"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        // Act
        Instance actual = await target.UpdateSubstatus(
            1337,
            Guid.NewGuid(),
            new Substatus { Label = "Substatus.Label", Description = "Substatus.Description" }
        );

        // Assert
        Assert.Equal(expected.Status.Substatus.Label, actual.Status.Substatus.Label);
        Assert.Equal(expected.Status.Substatus.Description, actual.Status.Substatus.Description);
        _handlerMock.VerifyAll();
    }

    [Fact]
    public async Task UpdateSubtatus_StorageReturnsNonSuccess_ThrowsPlatformHttpException()
    {
        // Arrange
        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.Forbidden,
            Content = new StringContent("Error message", Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["substatus"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        PlatformHttpException? actualException = null;

        // Act
        try
        {
            await target.UpdateSubstatus(1337, Guid.NewGuid(), new Substatus());
        }
        catch (PlatformHttpException e)
        {
            actualException = e;
        }

        // Assert
        _handlerMock.VerifyAll();

        Assert.NotNull(actualException);
    }

    [Fact]
    public async Task DeleteInstance_StorageReturnsSuccess()
    {
        // Arrange
        Guid instanceGuid = Guid.NewGuid();
        string instanceOwnerId = "1337";

        Instance expected = new Instance
        {
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerId },
            Id = $"{instanceOwnerId}/{instanceGuid}",
        };

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(expected), Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["1337"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        // Act
        Instance actual = await target.DeleteInstance(1337, Guid.NewGuid(), false);

        // Assert
        Assert.Equal("1337", actual.InstanceOwner.PartyId);
        _handlerMock.VerifyAll();
    }

    [Fact]
    public async Task DeleteInstance_StorageReturnsNonSuccess_ThrowsPlatformHttpException()
    {
        // Arrange
        Guid instanceGuid = Guid.NewGuid();

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.Forbidden,
            Content = new StringContent("Error message", Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["1337"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        PlatformHttpException? actualException = null;

        // Act
        try
        {
            await target.DeleteInstance(1337, instanceGuid, false);
        }
        catch (PlatformHttpException e)
        {
            actualException = e;
        }

        // Assert
        _handlerMock.VerifyAll();

        Assert.NotNull(actualException);
    }

    [Fact]
    public async Task UpdatePresentationTexts_StorageReturnsNonSuccess_ThrowsPlatformHttpException()
    {
        // Arrange
        Guid instanceGuid = Guid.NewGuid();

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.Forbidden,
            Content = new StringContent("Error message", Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["1337"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        PlatformHttpException? actualException = null;

        // Act
        try
        {
            await target.UpdatePresentationTexts(1337, instanceGuid, new PresentationTexts());
        }
        catch (PlatformHttpException e)
        {
            actualException = e;
        }

        // Assert
        _handlerMock.VerifyAll();

        Assert.NotNull(actualException);
    }

    [Fact]
    public async Task UpdatePresentationTexts_SuccessfulCallToStorage()
    {
        // Arrange
        Guid instanceGuid = Guid.NewGuid();
        int instanceOwnerId = 1337;

        Instance expected = new Instance
        {
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerId.ToString() },
            Id = $"{instanceOwnerId}/{instanceGuid}",
        };

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(expected), Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["presentationtexts"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        // Act
        await target.UpdatePresentationTexts(instanceOwnerId, instanceGuid, new PresentationTexts());

        // Assert
        _handlerMock.VerifyAll();
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public async Task UpdateDataValues_WithFullInstance_SuccessfullyCallsStorage(int methodVerion)
    {
        Guid instanceGuid = Guid.NewGuid();
        int instanceOwnerId = 1337;

        Instance instance = new Instance
        {
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerId.ToString() },
            Id = $"{instanceOwnerId}/{instanceGuid}",
        };

        using HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(instance), Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage], ["datavalues"]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        IInstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        // Act
        switch (methodVerion)
        {
            case 1:
                await target.UpdateDataValues(
                    instanceOwnerId,
                    instanceGuid,
                    new DataValues() { Values = new() { { "key", "value" } } },
                    authenticationMethod: null,
                    CancellationToken.None
                );
                break;
            case 2:
                await target.UpdateDataValue(
                    instance,
                    "key",
                    "value",
                    authenticationMethod: null,
                    CancellationToken.None
                );
                break;
            case 3:
                await target.UpdateDataValues(
                    instance,
                    new() { { "key", "value" } },
                    authenticationMethod: null,
                    CancellationToken.None
                );
                break;
        }

        // Assert
        var url = new Uri($"http://localhost/instances/{instanceOwnerId}/{instanceGuid}/datavalues");
        _handlerMock
            .Protected()
            .Verify(
                "SendAsync",
                Times.Once(),
                ItExpr.Is<HttpRequestMessage>(request => request.Method == HttpMethod.Put && request.RequestUri == url),
                ItExpr.IsAny<CancellationToken>()
            );
    }

    [Fact]
    public async Task QueryInstances_QueryResponseContainsNext()
    {
        // Arrange
        QueryResponse<Instance> queryResponse1 = new()
        {
            Count = 1,
            Instances = new List<Instance> { new Instance { Id = $"{1337}/{Guid.NewGuid()}" } },
            Next =
                "https://platform.altinn.no/storage/api/instances?appId=ttd%2Fapps-test&instanceOwner.partyId=1337&status.isArchived=false&status.isSoftDeleted=false&continuationtoken=abcd",
        };

        QueryResponse<Instance> queryResponse2 = new()
        {
            Count = 1,
            Instances = new List<Instance> { new Instance { Id = $"{1337}/{Guid.NewGuid()}" } },
        };

        string urlPart1 =
            "instances?appId=ttd%2Fapps-test&instanceOwner.partyId=1337&status.isArchived=false&status.isSoftDeleted=false";
        string urlPart2 =
            "https://platform.altinn.no/storage/api/instances?appId=ttd%2Fapps-test&instanceOwner.partyId=1337&status.isArchived=false&status.isSoftDeleted=false&continuationtoken=abcd";

        HttpResponseMessage httpResponseMessage1 = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(queryResponse1), Encoding.UTF8, "application/json"),
        };

        HttpResponseMessage httpResponseMessage2 = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(queryResponse2), Encoding.UTF8, "application/json"),
        };

        InitializeMocks([httpResponseMessage1, httpResponseMessage2], [urlPart1, urlPart2]);

        HttpClient httpClient = new HttpClient(_handlerMock.Object);

        InstanceClient target = new InstanceClient(
            _platformSettingsOptions.Object,
            _logger.Object,
            _authenticationTokenResolver.Object,
            httpClient,
            _telemetry.Object
        );

        Dictionary<string, StringValues> queryParams = new()
        {
            { "appId", $"ttd/apps-test" },
            { "instanceOwner.partyId", "1337" },
            { "status.isArchived", "false" },
            { "status.isSoftDeleted", "false" },
        };

        // Act
        List<Instance> instances = await target.GetInstances(queryParams);

        // Assert
        Assert.Equal(2, instances.Count);
        _handlerMock.VerifyAll();
    }

    private static string CreateDummyJwt()
    {
        static string B64Url(string s) =>
            Convert.ToBase64String(Encoding.UTF8.GetBytes(s)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

        var header = B64Url("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        var payload = B64Url("{\"sub\":\"123\",\"name\":\"dummy\"}");
        var sig = B64Url("sig");
        return $"{header}.{payload}.{sig}";
    }

    private void InitializeMocks(HttpResponseMessage[] httpResponseMessages, string[] urlPart)
    {
        PlatformSettings platformSettings = new PlatformSettings
        {
            ApiStorageEndpoint = "http://localhost",
            SubscriptionKey = "key",
        };
        _platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

        _authenticationTokenResolver
            .Setup(s => s.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(JwtToken.Parse(CreateDummyJwt()));

        if (httpResponseMessages.Length == 2)
        {
            _handlerMock
                .Protected()
                .SetupSequence<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(p =>
                        p.RequestUri!.ToString().Contains(urlPart[0]) || p.RequestUri.ToString().Contains(urlPart[1])
                    ),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(httpResponseMessages[0])
                .ReturnsAsync(httpResponseMessages[1]);
        }
        else
        {
            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(p => p.RequestUri!.ToString().Contains(urlPart[0])),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(httpResponseMessages[0])
                .Verifiable();
        }
    }

    public void Dispose()
    {
        _telemetry.Dispose();
    }
}
