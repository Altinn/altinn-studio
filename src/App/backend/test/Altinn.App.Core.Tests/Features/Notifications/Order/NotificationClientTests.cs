using System.Net;
using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Notifications.Order;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Order;
using Altinn.Common.AccessTokenClient.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Features.Notifications.Order;

public class NotificationCancelClientTests
{
    [Fact]
    public async Task Cancel_VerifyHttpCall()
    {
        // Arrange
        var notificationOrderId = Guid.NewGuid();
        var expectedUri = $"http://localhost:5101/notifications/api/v1/orders/{notificationOrderId}/cancel";

        HttpRequestMessage? capturedRequest = null;

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK))
            .Callback<HttpRequestMessage, CancellationToken>(
                (request, _) =>
                {
                    capturedRequest = request;
                }
            );

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient, withTelemetry: true);
        var (_, client, telemetrySink) = fixture;

        // Act
        await client.Cancel(notificationOrderId, default);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Method.Should().Be(HttpMethod.Put);
        capturedRequest!.RequestUri.Should().NotBeNull();
        capturedRequest!.RequestUri!.ToString().Should().Be(expectedUri);

        await Verify(telemetrySink?.GetSnapshot());
    }

    [Fact]
    public async Task Cancel_VerifyAccessTokenHeader()
    {
        // Arrange
        var notificationOrderId = Guid.NewGuid();
        const string expectedToken = "token";

        HttpRequestMessage? capturedRequest = null;

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK))
            .Callback<HttpRequestMessage, CancellationToken>(
                (request, _) =>
                {
                    capturedRequest = request;
                }
            );

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        await client.Cancel(notificationOrderId, default);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!
            .Headers.Should()
            .ContainSingle(h => h.Key == General.PlatformAccessTokenHeaderName && h.Value.Contains(expectedToken));
    }

    [Fact]
    public async Task Cancel_ShouldComplete_OnSuccess()
    {
        // Arrange
        var notificationOrderId = Guid.NewGuid();

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> act = async () => await client.Cancel(notificationOrderId, default);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Cancel_ShouldThrowNotificationCancelException_OnFailure()
    {
        // Arrange
        var notificationOrderId = Guid.NewGuid();

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                new HttpResponseMessage(HttpStatusCode.BadRequest)
                {
                    Content = new StringContent(string.Empty, Encoding.UTF8, "application/json"),
                }
            );

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> act = async () => await client.Cancel(notificationOrderId, default);

        // Assert
        await act.Should().ThrowAsync<NotificationCancelException>();
    }

    [Fact]
    public async Task Cancel_ShouldThrowNotificationCancelException_OnHttpRequestException()
    {
        // Arrange
        var notificationOrderId = Guid.NewGuid();

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ThrowsAsync(new HttpRequestException("Network error"));

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> act = async () => await client.Cancel(notificationOrderId, default);

        // Assert
        await act.Should().ThrowAsync<NotificationCancelException>();
    }

    [Fact]
    public async Task Cancel_ShouldRethrowOperationCanceledException_WhenCancellationRequested()
    {
        // Arrange
        var notificationOrderId = Guid.NewGuid();
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ThrowsAsync(new OperationCanceledException(cts.Token));

        using var httpClient = new HttpClient(handlerMock.Object);
        using var fixture = CreateFixture(httpClient);
        var (_, client, _) = fixture;

        // Act
        Func<Task> act = async () => await client.Cancel(notificationOrderId, cts.Token);

        // Assert
        await act.Should().ThrowAsync<OperationCanceledException>();
        await act.Should().NotThrowAsync<NotificationCancelException>();
    }

    [Fact]
    public void DIContainer_Accepts_Missing_TelemetryClient()
    {
        using var fixture = CreateFixture(withTelemetry: false);
        var (_, client, _) = fixture;
        Assert.NotNull(client);
    }

    private static Fixture CreateFixture(HttpClient? httpClient = null, bool withTelemetry = true)
    {
        var services = new ServiceCollection();

        services.AddSingleton<HttpClient>(httpClient ?? new HttpClient());

        services.AddLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddProvider(NullLoggerProvider.Instance);
        });

        var appId = Guid.NewGuid().ToString();
        var appDataMock = new Mock<IAppMetadata>();
        appDataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata($"ttd/{appId}"));
        services.AddSingleton<IAppMetadata>(appDataMock.Object);

        var accessTokenGenerator = new Mock<IAccessTokenGenerator>();
        accessTokenGenerator.Setup(a => a.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>())).Returns("token");
        services.AddSingleton<IAccessTokenGenerator>(accessTokenGenerator.Object);

        services.AddSingleton<IOptions<PlatformSettings>>(
            Microsoft.Extensions.Options.Options.Create(new PlatformSettings())
        );

        if (withTelemetry)
        {
            services.AddTelemetrySink();
        }

        services.AddTransient<INotificationCancelClient, NotificationCancelClient>();

        var sp = services.BuildStrictServiceProvider();

        var client = (NotificationCancelClient)sp.GetRequiredService<INotificationCancelClient>();
        var telemetrySink = sp.GetService<TelemetrySink>();
        return new(sp, client, telemetrySink);
    }

    private readonly record struct Fixture(
        IServiceProvider ServiceProvider,
        NotificationCancelClient Client,
        TelemetrySink? TelemetrySink
    ) : IDisposable
    {
        public void Dispose()
        {
            if (ServiceProvider is IDisposable sp)
                sp.Dispose();
        }
    }
}
