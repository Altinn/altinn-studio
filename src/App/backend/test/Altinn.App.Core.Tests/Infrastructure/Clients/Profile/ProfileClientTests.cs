using System.Net;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Infrastructure.Clients.Profile;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Profile;

public class ProfileClientTests
{
    private readonly record struct Fixture(ServiceProvider ServiceProvider, Mock<HttpMessageHandler> Handler)
        : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => ServiceProvider.DisposeAsync();
    }

    private Fixture BuildFixture(Func<UserProfile?>? userProfileFactory = null)
    {
        var services = new ServiceCollection();

        userProfileFactory ??= () => new UserProfile { UserId = 1234 };

        var httpContextMock = new Mock<HttpContext>();
        httpContextMock.Setup(x => x.Request.Cookies["AltinnStudioRuntime"]).Returns("");
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(x => x.HttpContext).Returns(httpContextMock.Object);
        httpContextAccessor.Setup(x => x.HttpContext!.Request!.Headers["Authorization"]).Returns("Bearer token");
        services.AddSingleton(httpContextAccessor.Object);

        var appMetadataMock = new Mock<IAppMetadata>();
        ApplicationMetadata appMetadata = new("ttd/test")
        {
            DataTypes = new List<DataType>()
            {
                new DataType()
                {
                    Id = "test",
                    TaskId = "Task_1",
                    EnableFileScan = false,
                    ValidationErrorOnPendingFileScan = false,
                },
            },
        };
        appMetadataMock.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(appMetadata);
        services.AddSingleton(appMetadataMock.Object);

        var tokenGenerator = new Mock<IAccessTokenGenerator>();
        tokenGenerator.Setup(t => t.GenerateAccessToken("ttd", "test")).Returns("access-token");
        services.AddSingleton(tokenGenerator.Object);

        services.AddTelemetrySink();
        services.AddSingleton<ILogger<ProfileClient>>(NullLogger<ProfileClient>.Instance);
        services.Configure<PlatformSettings>(_ => { });
        services.Configure<AppSettings>(o => o.RuntimeCookieName = "AltinnStudioRuntime");
        services.Configure<CacheSettings>(o => o.ProfileCacheLifetimeSeconds = 1);

        var handler = new Mock<HttpMessageHandler>();
        handler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var profile = userProfileFactory();
                return new HttpResponseMessage
                {
                    StatusCode = profile is null ? HttpStatusCode.NotFound : HttpStatusCode.OK,
                    Content = new StringContent(JsonSerializer.Serialize(profile)),
                };
            })
            .Verifiable();
        var httpClient = new HttpClient(handler.Object);
        services.AddMemoryCache();
        services.AddSingleton(_ => httpClient);
        services.AddProfileClient();
        return new(services.BuildStrictServiceProvider(), handler);
    }

    [Fact]
    public async Task Builds_From_DI_Container()
    {
        await using var fixture = BuildFixture();

        var client = fixture.ServiceProvider.GetRequiredService<IProfileClient>();
        Assert.NotNull(client);
    }

    [Fact]
    public async Task Returns_Test_Profile()
    {
        const int userId = 1234;
        TelemetrySink telemetry;
        {
            await using var fixture = BuildFixture(() => new UserProfile { UserId = userId });
            telemetry = fixture.ServiceProvider.GetRequiredService<TelemetrySink>();

            var client = fixture.ServiceProvider.GetRequiredService<IProfileClient>();

            var profile = await client.GetUserProfile(userId);
            Assert.NotNull(profile);
            Assert.Equal(userId, profile.UserId);
        }

        await Verify(telemetry.GetSnapshot());
    }

    [Fact]
    public async Task Returns_Test_Profile_Cached()
    {
        const int userId = 1234;
        await using var fixture = BuildFixture(() => new UserProfile { UserId = userId });

        var client1 = fixture.ServiceProvider.GetRequiredService<IProfileClient>();
        var client2 = fixture.ServiceProvider.GetRequiredService<IProfileClient>();
        Assert.NotSame(client1, client2);

        var profile1 = await client1.GetUserProfile(userId);
        var profile2 = await client2.GetUserProfile(userId);
        Assert.Same(profile1, profile2);
        fixture
            .Handler.Protected()
            .Verify("SendAsync", Times.Once(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task Cache_Expires()
    {
        const int userId = 1234;
        await using var fixture = BuildFixture(() => new UserProfile { UserId = userId });

        var client = fixture.ServiceProvider.GetRequiredService<IProfileClient>();
        var cacheExpirySeconds = fixture
            .ServiceProvider.GetRequiredService<IOptions<CacheSettings>>()
            .Value.ProfileCacheLifetimeSeconds;

        var profile1 = await client.GetUserProfile(userId);
        fixture
            .Handler.Protected()
            .Verify("SendAsync", Times.Once(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());

        await Task.Delay((cacheExpirySeconds * 1000) + 50);

        var profile2 = await client.GetUserProfile(userId);
        Assert.NotSame(profile1, profile2);
        fixture
            .Handler.Protected()
            .Verify(
                "SendAsync",
                Times.Exactly(2),
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            );
    }

    [Fact]
    public async Task Retries_On_Previous_Null()
    {
        const int userId = 1234;
        await using var fixture = BuildFixture(() => null);

        var client = fixture.ServiceProvider.GetRequiredService<IProfileClient>();

        var profile1 = await client.GetUserProfile(userId);
        var profile2 = await client.GetUserProfile(userId);
        Assert.Null(profile1);
        Assert.Null(profile2);
        fixture
            .Handler.Protected()
            .Verify(
                "SendAsync",
                Times.Exactly(2),
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            );
    }
}
