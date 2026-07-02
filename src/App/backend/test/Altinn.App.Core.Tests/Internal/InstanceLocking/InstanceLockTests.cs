using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using WireMock.Matchers.Request;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Altinn.App.Core.Tests.Internal.InstanceLocking;

public sealed class InstanceLockTests
{
    private sealed record Fixture(WireMockServer Server, ServiceProvider ServiceProvider) : IDisposable
    {
        private static readonly Guid _instanceGuid = Guid.NewGuid();
        private const int InstanceOwnerPartyId = 12345;

        private static readonly Authenticated _defaultAuth = TestAuthentication.GetUserAuthentication();

        public readonly string ServerUrl = Server.Url ?? throw new Exception("Missing server URL");

        public static Fixture Create(Action<IServiceCollection>? registerCustomServices = null)
        {
            var server = WireMockServer.Start();

            var services = new ServiceCollection();

            services.Configure<PlatformSettings>(settings =>
            {
                var testUrl = server.Url ?? throw new Exception("Missing server URL");
                settings.ApiStorageEndpoint = testUrl + new Uri(settings.ApiStorageEndpoint).PathAndQuery;
            });

            var mocks = new FixtureMocks();
            mocks.AuthenticationContextMock.Setup(x => x.Current).Returns(_defaultAuth);

            services.AddHttpClient();
            services.AddSingleton<InstanceLockClient>();

            var httpContext = new DefaultHttpContext();
            httpContext.Request.RouteValues.Add("instanceOwnerPartyId", InstanceOwnerPartyId);
            httpContext.Request.RouteValues.Add("instanceGuid", _instanceGuid);
            var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
            services.AddSingleton<IHttpContextAccessor>(httpContextAccessor);

            services.AddSingleton<IAuthenticationTokenResolver, AuthenticationTokenResolver>();
            services.AddSingleton(mocks.MaskinportenClientMock.Object);
            services.AddSingleton(mocks.AppMetadataMock.Object);
            services.AddSingleton(mocks.AuthenticationContextMock.Object);

            services.AddRuntimeEnvironment();

            services.AddSingleton<InstanceLocker>();

            registerCustomServices?.Invoke(services);

            var serviceProvider = services.BuildServiceProvider();

            return new Fixture(server, serviceProvider);
        }

        public sealed record FixtureMocks
        {
            public Mock<IAuthenticationContext> AuthenticationContextMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IAppMetadata> AppMetadataMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IMaskinportenClient> MaskinportenClientMock { get; init; } = new(MockBehavior.Strict);
        }

        public void Dispose()
        {
            Server.Stop();
            Server.Dispose();
            ServiceProvider.Dispose();
        }

        public IRequestBuilder GetAcquireLockRequestBuilder()
        {
            return Request
                .Create()
                .WithPath($"/storage/api/v1/instances/{InstanceOwnerPartyId}/{_instanceGuid}/lock")
                .UsingPost()
                .WithHeader("Authorization", $"Bearer {_defaultAuth.Token}");
        }

        public IRequestBuilder GetReleaseLockRequestBuilder(string lockToken)
        {
            return Request
                .Create()
                .WithPath($"/storage/api/v1/instances/{InstanceOwnerPartyId}/{_instanceGuid}/lock")
                .UsingPatch()
                .WithHeader("Authorization", $"Bearer {_defaultAuth.Token}")
                .WithHeader("Altinn-Storage-Lock-Token", lockToken);
        }
    }

    [Fact]
    public async Task HappyPath()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);

        var acquireLockRequestBuilder = fixture.GetAcquireLockRequestBuilder();
        var releaseLockRequestBuilder = fixture.GetReleaseLockRequestBuilder(lockToken);

        var testRequestBuilder = Request.Create().WithPath($"/test").UsingGet();

        fixture
            .Server.Given(acquireLockRequestBuilder)
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(releaseLockRequestBuilder)
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        fixture.Server.Given(testRequestBuilder).RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var httpClient = fixture.ServiceProvider.GetRequiredService<IHttpClientFactory>().CreateClient();
        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using (var handle = await instanceLocker.Lock())
        {
            using var response = await httpClient.GetAsync($"{fixture.ServerUrl}/test");
            response.EnsureSuccessStatusCode();
        }

        var requests = fixture.Server.LogEntries;
        Assert.Equal(3, requests.Count);

        var acquireMatchResult = new RequestMatchResult();
        var message0 = requests[0].RequestMessage;
        Assert.NotNull(message0);
        acquireLockRequestBuilder.GetMatchingScore(message0, acquireMatchResult);
        Assert.True(acquireMatchResult.IsPerfectMatch);

        var testMatchResult = new RequestMatchResult();
        var message1 = requests[1].RequestMessage;
        Assert.NotNull(message1);
        testRequestBuilder.GetMatchingScore(message1, testMatchResult);
        Assert.True(testMatchResult.IsPerfectMatch);

        var releaseMatchResult = new RequestMatchResult();
        var message2 = requests[2].RequestMessage;
        Assert.NotNull(message2);
        releaseLockRequestBuilder.GetMatchingScore(message2, releaseMatchResult);
        Assert.True(releaseMatchResult.IsPerfectMatch);
    }

    [Fact]
    public async Task DoubleLock_ThrowsInvalidOperationException()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using var handle = await instanceLocker.Lock();
        await Assert.ThrowsAsync<InvalidOperationException>(instanceLocker.Lock);
    }

    [Fact]
    public async Task LockReleasedOnException()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await Assert.ThrowsAsync<Exception>(async () =>
        {
            await using var handle = await instanceLocker.Lock();
            throw new Exception();
        });

        var releaseRequests = fixture.Server.FindLogEntries(fixture.GetReleaseLockRequestBuilder(lockToken));
        Assert.Single(releaseRequests);
    }

    [Fact]
    public async Task CustomTtl_UsedInStorageApiCall()
    {
        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);
        var ttl = TimeSpan.FromSeconds(120);

        using var fixture = Fixture.Create();

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using (var handle = await instanceLocker.Lock(ttl))
        {
            // Lock acquired with custom TTL
        }

        var acquireRequests = fixture.Server.FindLogEntries(fixture.GetAcquireLockRequestBuilder());
        Assert.Single(acquireRequests);
        var message0 = acquireRequests[0].RequestMessage;
        Assert.NotNull(message0);
        var requestBody = message0.Body;

        await Verify(new { RequestBody = requestBody });
    }

    [Fact]
    public async Task LockReleaseFailure_DoesNotThrow()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.InternalServerError));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using (var handle = await instanceLocker.Lock())
        {
            // Lock acquired, release will fail but should not throw
        }

        var releaseRequests = fixture.Server.FindLogEntries(fixture.GetReleaseLockRequestBuilder(lockToken));
        Assert.Single(releaseRequests);
    }

    [Theory]
    [InlineData(HttpStatusCode.Conflict)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.InternalServerError)]
    public async Task StorageApiError_ThrowsCorrectPlatformHttpException(HttpStatusCode storageStatusCode)
    {
        using var fixture = Fixture.Create();

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(Response.Create().WithStatusCode(storageStatusCode));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        var exception = await Assert.ThrowsAsync<PlatformHttpResponseSnapshotException>(instanceLocker.Lock);

        var acquireRequests = fixture.Server.FindLogEntries(fixture.GetAcquireLockRequestBuilder());
        Assert.Single(acquireRequests);

        await Verify(new { Exception = exception })
            .UseParameters(storageStatusCode)
            .IgnoreMember<PlatformHttpResponseSnapshotException>(x => x.Headers);
    }

    [Fact]
    public async Task NullResponseBody_ThrowsPlatformHttpException()
    {
        using var fixture = Fixture.Create();

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithHeader("Content-Type", "application/json")
                    .WithBody("null")
            );

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        var exception = await Assert.ThrowsAsync<PlatformHttpResponseSnapshotException>(instanceLocker.Lock);

        var acquireRequests = fixture.Server.FindLogEntries(fixture.GetAcquireLockRequestBuilder());
        Assert.Single(acquireRequests);

        await Verify(new { Exception = exception }).IgnoreMember<PlatformHttpResponseSnapshotException>(x => x.Headers);
    }

    [Fact]
    public async Task EmptyJsonResponseBody_ThrowsPlatformHttpException()
    {
        using var fixture = Fixture.Create();

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithHeader("Content-Type", "application/json")
                    .WithBody("{}")
            );

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        var exception = await Assert.ThrowsAsync<PlatformHttpResponseSnapshotException>(instanceLocker.Lock);

        Assert.Single(fixture.Server.LogEntries);

        await Verify(new { Exception = exception }).IgnoreMember<PlatformHttpResponseSnapshotException>(x => x.Headers);
    }

    [Fact]
    public async Task InvalidInstanceId_ThrowsInvalidOperationException()
    {
        using var fixture = Fixture.Create(services =>
        {
            var httpContext = new DefaultHttpContext();
            httpContext.Request.RouteValues.Add("instanceOwnerPartyId", "invalid");
            httpContext.Request.RouteValues.Add("instanceGuid", "format");
            var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
            services.AddSingleton<IHttpContextAccessor>(httpContextAccessor);
        });

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(instanceLocker.Lock);

        Assert.Empty(fixture.Server.LogEntries);
        await Verify(new { Exception = exception });
    }

    [Fact]
    public async Task CurrentLockToken_ReturnsToken_WhenLocked()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        Assert.Null(instanceLocker.CurrentLockToken);

        await using (var handle = await instanceLocker.Lock())
        {
            Assert.Equal(lockToken, instanceLocker.CurrentLockToken);
        }

        Assert.Null(instanceLocker.CurrentLockToken);
    }

    [Fact]
    public async Task Init_ReturnsHandle_WithoutMakingHttpCalls()
    {
        using var fixture = Fixture.Create();

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using var handle = instanceLocker.InitLock();

        Assert.NotNull(handle);
        Assert.Empty(fixture.Server.LogEntries);
        Assert.Null(instanceLocker.CurrentLockToken);
    }

    [Fact]
    public async Task Init_ThenLock_AcquiresLock()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using var handle = instanceLocker.InitLock();

        // No HTTP call yet
        Assert.Empty(fixture.Server.LogEntries);
        Assert.Null(instanceLocker.CurrentLockToken);

        // Acquire the lock
        await handle.Lock();

        var acquireRequests = fixture.Server.FindLogEntries(fixture.GetAcquireLockRequestBuilder());
        Assert.Single(acquireRequests);
        Assert.Equal(lockToken, instanceLocker.CurrentLockToken);
    }

    [Fact]
    public async Task Init_ThenLock_WithCustomTtl()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);
        var ttl = TimeSpan.FromSeconds(60);

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using var handle = instanceLocker.InitLock();
        await handle.Lock(ttl);

        var acquireRequests = fixture.Server.FindLogEntries(fixture.GetAcquireLockRequestBuilder());
        Assert.Single(acquireRequests);
        var message0 = acquireRequests[0].RequestMessage;
        Assert.NotNull(message0);
        var requestBody = message0.Body;

        await Verify(new { RequestBody = requestBody });
    }

    [Fact]
    public async Task Lock_IsIdempotent_DoesNotMakeSecondHttpCall()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using var handle = instanceLocker.InitLock();
        await handle.Lock();
        await handle.Lock(); // Second call should be a no-op

        var acquireRequests = fixture.Server.FindLogEntries(fixture.GetAcquireLockRequestBuilder());
        Assert.Single(acquireRequests);
    }

    [Fact]
    public async Task DisposeWithoutLock_DoesNotMakeHttpCalls()
    {
        using var fixture = Fixture.Create();

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using (var handle = instanceLocker.InitLock())
        {
            // Never call Lock — just dispose
        }

        Assert.Empty(fixture.Server.LogEntries);
    }

    [Fact]
    public async Task InitLock_WhenHandleAlreadyActive_ThrowsInvalidOperationException()
    {
        using var fixture = Fixture.Create();

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using var handle = instanceLocker.InitLock();

        var exception = Assert.Throws<InvalidOperationException>(() => instanceLocker.InitLock());

        Assert.Empty(fixture.Server.LogEntries);
    }

    [Fact]
    public async Task InitLock_AfterDisposeWithoutLock_ReturnsNewHandle()
    {
        using var fixture = Fixture.Create();

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await using (var handle = instanceLocker.InitLock())
        {
            // Never call Lock — just dispose
        }

        await using var newHandle = instanceLocker.InitLock();

        Assert.NotNull(newHandle);
        Assert.Empty(fixture.Server.LogEntries);
    }

    [Fact]
    public async Task Lock_WhenAcquireFails_ReleasesActiveHandle()
    {
        using var fixture = Fixture.Create();

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.Conflict));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        await Assert.ThrowsAsync<PlatformHttpResponseSnapshotException>(instanceLocker.Lock);

        await using var handle = instanceLocker.InitLock();

        Assert.NotNull(handle);
    }

    [Fact]
    public async Task Dispose_IsIdempotent()
    {
        using var fixture = Fixture.Create();

        var lockId = Guid.NewGuid();
        var lockToken = GenerateLockToken(lockId);

        fixture
            .Server.Given(fixture.GetAcquireLockRequestBuilder())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(HttpStatusCode.OK)
                    .WithBodyAsJson(new InstanceLockResponse { LockToken = lockToken })
            );

        fixture
            .Server.Given(fixture.GetReleaseLockRequestBuilder(lockToken))
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.OK));

        var instanceLocker = fixture.ServiceProvider.GetRequiredService<InstanceLocker>();

        var handle = await instanceLocker.Lock();

        await handle.DisposeAsync();
        await handle.DisposeAsync();

        var releaseRequests = fixture.Server.FindLogEntries(fixture.GetReleaseLockRequestBuilder(lockToken));
        Assert.Single(releaseRequests);

        await using var newHandle = instanceLocker.InitLock();
        Assert.NotNull(newHandle);
    }

    private string GenerateLockToken(Guid lockId)
    {
        return Convert.ToBase64String(lockId.ToByteArray());
    }
}
