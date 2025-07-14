using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Infrastructure.Clients.AccessManagement;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.AccessManagement.Models.Shared;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.AccessManagement;

public class AccessManagementClientTests
{
    private readonly DelegationRequest _delegationRequest = new()
    {
        From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
        To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
        ResourceId = "testapp",
        InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
        Rights =
        [
            new()
            {
                Resource = [new AppResource { Value = "testorg/testapp" }, new TaskResource { Value = "signing" }],
                Action = new AltinnAction { Type = DelegationConst.ActionId, Value = ActionType.Sign },
            },
        ],
    };

    [Theory]
    [InlineData(
        "Initial error",
        """{"detail": "One or more validation errors occurred.", "validationErrors": [{"code": "AM.VLD-00004", "detail": "Policy error"}], "code": "STD-00000"}""",
        "One or more validation errors occurred. ValidationErrors: [{\"code\": \"AM.VLD-00004\", \"detail\": \"Policy error\"}] Code: STD-00000"
    )]
    [InlineData("Initial error", """{"detail": "Something went wrong"}""", "Something went wrong")]
    [InlineData(
        "Initial error",
        """{"validationErrors": [{"field": "name", "message": "Name is required"}]}""",
        "Initial error ValidationErrors: [{\"field\": \"name\", \"message\": \"Name is required\"}]"
    )]
    [InlineData("Initial error", """{"code": "ERR-001"}""", "Initial error Code: ERR-001")]
    [InlineData("Initial error", """{"detail": null, "code": "ERR-001"}""", "Initial error Code: ERR-001")]
    [InlineData("Initial error", """{}""", "Initial error")]
    [InlineData(
        "Original error",
        """{"detail": "Access denied", "code": "AUTH-403"}""",
        "Access denied Code: AUTH-403"
    )]
    [InlineData(
        "Bad request",
        """{"validationErrors": [{"field": "id", "error": "Invalid format"}], "code": "VAL-400"}""",
        "Bad request ValidationErrors: [{\"field\": \"id\", \"error\": \"Invalid format\"}] Code: VAL-400"
    )]
    public void FormatErrorDetails_ReturnsExpectedResult(string initialErrorDetails, string json, string expected)
    {
        // Arrange
        var problemDetails = JsonSerializer.Deserialize<JsonElement>(json);

        // Act
        var result = AccessManagementClient.FormatErrorDetails(initialErrorDetails, problemDetails);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public async Task DelegateRights_VerifyHttpCall()
    {
        // Arrange
        var expectedUri =
            "http://localhost:5101/app/delegations/resource/testapp/instance/instanceOwner/12345678-1234-1234-1234-123456789012";
        var expectedContent = JsonSerializer.Serialize(DelegationRequest.ConvertToDto(_delegationRequest));

        HttpRequestMessage? capturedRequest = null;
        string capturedContent = string.Empty;

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"success\": true}", Encoding.UTF8, "application/json"),
                }
            )
            .Callback<HttpRequestMessage, CancellationToken>(
                async (request, token) =>
                {
                    capturedRequest = request;
                    capturedContent = await request.Content!.ReadAsStringAsync(token);
                }
            );

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient, true);
        var (_, client, telemetrySink) = fixture;

        // Act
        _ = await client.DelegateRights(_delegationRequest, default);

        // Assert
        capturedContent.Should().Be(expectedContent);
        capturedRequest.Should().NotBeNull();
        capturedRequest!.RequestUri.Should().NotBeNull();
        capturedRequest!.RequestUri!.ToString().Should().Be(expectedUri);
        capturedRequest!.Method.Should().Be(HttpMethod.Post);
        capturedRequest!.Headers.Should().ContainKey("PlatformAccessToken");
        capturedRequest!.Content!.Headers.ContentType!.MediaType.Should().Be("application/json");

        await Verify(telemetrySink?.GetSnapshot());
    }

    [Fact]
    public async Task DelegateRights_ShouldReturnDelegationResponse_OnSuccess()
    {
        // Arrange
        var responseJson = JsonSerializer.Serialize(
            new DelegationResponse
            {
                Delegator = new DelegationParty
                {
                    Type = DelegationConst.Party,
                    Value = "12345678-1234-1234-1234-123456789012",
                },
                Delegatee = new DelegationParty
                {
                    Type = DelegationConst.Party,
                    Value = "87654321-4321-4321-4321-210987654321",
                },
                ResourceId = "testapp",
                InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
                Rights =
                [
                    new()
                    {
                        Resource =
                        [
                            new AppResource { Value = "testorg/testapp" },
                            new TaskResource { Value = "signing" },
                        ],
                        Action = new AltinnAction { Type = DelegationConst.ActionId, Value = ActionType.Sign },
                        Status = "Delegated",
                    },
                ],
            }
        );

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent(responseJson, Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        var delegationResponse = await client.DelegateRights(_delegationRequest, default);

        // Assert
        delegationResponse.Should().NotBeNull();
        delegationResponse.Delegatee.Should().NotBeNull();
        delegationResponse.Delegatee!.Value.Should().Be(_delegationRequest.To?.Value);
        delegationResponse.Delegator.Should().NotBeNull();
        delegationResponse.Delegator!.Value.Should().Be(_delegationRequest.From?.Value);
        delegationResponse.ResourceId.Should().Be(_delegationRequest.ResourceId);
        delegationResponse.InstanceId.Should().Be(_delegationRequest.InstanceId);
        delegationResponse.Rights.Should().HaveCount(1);
        delegationResponse.Rights[0].Status.Should().Be("Delegated");
    }

    [Fact]
    public async Task DelegateRights_ShouldThrowAccessManagementRequestException_OnHttpError()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent(string.Empty, Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> delegateRights = async () => await client.DelegateRights(_delegationRequest, default);

        // Assert
        await FluentActions.Awaiting(delegateRights).Should().ThrowAsync<AccessManagementRequestException>();
    }

    [Fact]
    public async Task DelegateRights_ShouldThrowAccessManagementRequestException_OnInvalidJsonResponse()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent("invalid json", Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> delegateRights = async () => await client.DelegateRights(_delegationRequest, default);

        // Assert
        await FluentActions.Awaiting(delegateRights).Should().ThrowAsync<AccessManagementRequestException>();
    }

    [Fact]
    public async Task DelegateRights_ShouldThrowAccessManagementRequestException_OnNullResponse()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent("null", Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> delegateRights = async () => await client.DelegateRights(_delegationRequest, default);

        // Assert
        await FluentActions.Awaiting(delegateRights).Should().ThrowAsync<AccessManagementRequestException>();
    }

    [Fact]
    public async Task RevokeRights_VerifyHttpCall()
    {
        // Arrange
        var expectedUri =
            "http://localhost:5101/app/delegationrevoke/resource/testapp/instance/instanceOwner/12345678-1234-1234-1234-123456789012";
        var expectedContent = JsonSerializer.Serialize(DelegationRequest.ConvertToDto(_delegationRequest));

        HttpRequestMessage? capturedRequest = null;
        string capturedContent = string.Empty;

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"success\": true}", Encoding.UTF8, "application/json"),
                }
            )
            .Callback<HttpRequestMessage, CancellationToken>(
                async (request, token) =>
                {
                    capturedRequest = request;
                    capturedContent = await request.Content!.ReadAsStringAsync(token);
                }
            );

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient, true);
        var (_, client, telemetrySink) = fixture;

        // Act
        _ = await client.RevokeRights(_delegationRequest, default);

        // Assert
        capturedContent.Should().Be(expectedContent);
        capturedRequest.Should().NotBeNull();
        capturedRequest!.RequestUri.Should().NotBeNull();
        capturedRequest!.RequestUri!.ToString().Should().Be(expectedUri);
        capturedRequest!.Method.Should().Be(HttpMethod.Post);
        capturedRequest!.Headers.Should().ContainKey("PlatformAccessToken");
        capturedRequest!.Content!.Headers.ContentType!.MediaType.Should().Be("application/json");

        await Verify(telemetrySink?.GetSnapshot());
    }

    [Fact]
    public async Task RevokeRights_ShouldReturnDelegationResponse_OnSuccess()
    {
        // Arrange
        var responseJson = JsonSerializer.Serialize(
            new DelegationResponse
            {
                Delegator = new DelegationParty
                {
                    Type = DelegationConst.Party,
                    Value = "12345678-1234-1234-1234-123456789012",
                },
                Delegatee = new DelegationParty
                {
                    Type = DelegationConst.Party,
                    Value = "87654321-4321-4321-4321-210987654321",
                },
                ResourceId = "testapp",
                InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
                Rights =
                [
                    new()
                    {
                        Resource =
                        [
                            new AppResource { Value = "testorg/testapp" },
                            new TaskResource { Value = "signing" },
                        ],
                        Action = new AltinnAction { Type = DelegationConst.ActionId, Value = ActionType.Sign },
                        Status = "Revoked",
                    },
                ],
            }
        );

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent(responseJson, Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        var delegationResponse = await client.RevokeRights(_delegationRequest, default);

        // Assert
        delegationResponse.Should().NotBeNull();
        delegationResponse.Delegatee.Should().NotBeNull();
        delegationResponse.Delegatee!.Value.Should().Be(_delegationRequest.To?.Value);
        delegationResponse.Delegator.Should().NotBeNull();
        delegationResponse.Delegator!.Value.Should().Be(_delegationRequest.From?.Value);
        delegationResponse.ResourceId.Should().Be(_delegationRequest.ResourceId);
        delegationResponse.InstanceId.Should().Be(_delegationRequest.InstanceId);
        delegationResponse.Rights.Should().HaveCount(1);
        delegationResponse.Rights[0].Status.Should().Be("Revoked");
    }

    [Fact]
    public async Task RevokeRights_ShouldThrowAccessManagementRequestException_OnHttpError()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent(string.Empty, Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> revokeRights = async () => await client.RevokeRights(_delegationRequest, default);

        // Assert
        await FluentActions.Awaiting(revokeRights).Should().ThrowAsync<AccessManagementRequestException>();
    }

    [Fact]
    public async Task RevokeRights_ShouldThrowAccessManagementRequestException_OnInvalidJsonResponse()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent("invalid json", Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> revokeRights = async () => await client.RevokeRights(_delegationRequest, default);

        // Assert
        await FluentActions.Awaiting(revokeRights).Should().ThrowAsync<AccessManagementRequestException>();
    }

    [Fact]
    public async Task RevokeRights_ShouldThrowAccessManagementRequestException_OnNullResponse()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent("null", Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);

        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> revokeRights = async () => await client.RevokeRights(_delegationRequest, default);

        // Assert
        await FluentActions.Awaiting(revokeRights).Should().ThrowAsync<AccessManagementRequestException>();
    }

    [Fact]
    public async Task DelegateRights_ShouldLogCorrectInformation()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<AccessManagementClient>>();

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent("{\"success\": true}", Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient, logger: loggerMock.Object);
        var (_, client, _) = fixture;

        // Act
        await client.DelegateRights(_delegationRequest, default);

        // Assert
        loggerMock.Verify(
            x =>
                x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Delegating rights to")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task RevokeRights_ShouldLogCorrectInformation()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<AccessManagementClient>>();

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var jsonContent = new StringContent("{\"success\": true}", Encoding.UTF8, "application/json");
                var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = jsonContent };
                return response;
            });

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient, logger: loggerMock.Object);
        var (_, client, _) = fixture;

        // Act
        await client.RevokeRights(_delegationRequest, default);

        // Assert
        loggerMock.Verify(
            x =>
                x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Revoking rights from")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()
                ),
            Times.Once
        );
    }

    [Fact]
    public void DIContainer_Accepts_Missing_TelemetryClient()
    {
        using var fixture = CreateFixture(withTelemetry: false);
        var (_, client, _) = fixture;
        Assert.NotNull(client);
    }

    [Fact]
    public async Task DelegateRights_ShouldPreserveOriginalAccessManagementRequestException()
    {
        // Arrange
        var originalException = new AccessManagementRequestException(
            "Original exception",
            null,
            HttpStatusCode.BadRequest,
            "content",
            null
        );

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ThrowsAsync(originalException);

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> delegateRights = async () => await client.DelegateRights(_delegationRequest, default);

        // Assert
        var thrownException = await FluentActions
            .Awaiting(delegateRights)
            .Should()
            .ThrowAsync<AccessManagementRequestException>();
        thrownException.Which.Should().BeSameAs(originalException);
    }

    [Fact]
    public async Task RevokeRights_ShouldPreserveOriginalAccessManagementRequestException()
    {
        // Arrange
        var originalException = new AccessManagementRequestException(
            "Original exception",
            null,
            HttpStatusCode.BadRequest,
            "content",
            null
        );

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ThrowsAsync(originalException);

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> revokeRights = async () => await client.RevokeRights(_delegationRequest, default);

        // Assert
        var thrownException = await FluentActions
            .Awaiting(revokeRights)
            .Should()
            .ThrowAsync<AccessManagementRequestException>();
        thrownException.Which.Should().BeSameAs(originalException);
    }

    private static Fixture CreateFixture(
        HttpClient? httpClient = null,
        bool withTelemetry = true,
        ILogger<AccessManagementClient>? logger = null
    )
    {
        var services = new ServiceCollection();

        if (httpClient is not null)
        {
            services.AddSingleton<HttpClient>(httpClient);
        }
        else
        {
            services.AddSingleton<HttpClient>(_ => new HttpClient());
        }

        if (logger is not null)
        {
            services.AddSingleton<ILogger<AccessManagementClient>>(logger);
        }
        else
        {
            services.AddLogging(logging =>
            {
                logging.ClearProviders();
                logging.AddProvider(NullLoggerProvider.Instance);
            });
        }

        var appId = Guid.NewGuid().ToString();

        var appDataMock = new Mock<IAppMetadata>();
        var applicationMetadata = new ApplicationMetadata($"testorg/{appId}") { Org = "testorg" };
        appDataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        services.AddSingleton(appDataMock.Object);

        var accessTokenGenerator = new Mock<IAccessTokenGenerator>();
        accessTokenGenerator.Setup(a => a.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>())).Returns("token");
        services.AddSingleton(accessTokenGenerator.Object);

        services.AddSingleton(
            Options.Create(new PlatformSettings { ApiAccessManagementEndpoint = "http://localhost:5101/" })
        );

        if (withTelemetry)
        {
            services.AddTelemetrySink();
        }

        services.AddTransient<IAccessManagementClient, AccessManagementClient>();

        var sp = services.BuildStrictServiceProvider();

        var client = (AccessManagementClient)sp.GetRequiredService<IAccessManagementClient>();
        var telemetrySink = sp.GetService<TelemetrySink>();
        return new(sp, client, telemetrySink);
    }

    private readonly record struct Fixture(
        IServiceProvider ServiceProvider,
        AccessManagementClient Client,
        TelemetrySink? TelemetrySink
    ) : IDisposable
    {
        public void Dispose()
        {
            if (ServiceProvider is IDisposable sp)
            {
                sp.Dispose();
            }
        }
    }
}
