using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using StackExchange.Redis;

namespace Altinn.Studio.Preview.Tests.Sessions;

/// <summary>
/// The session lifetime as Redis keeps it, so these run against a real Redis. Set <c>PREVIEW_TEST_REDIS</c> to its
/// connection string, such as <c>localhost:6379</c>, to run them. CI does.
/// </summary>
public sealed class SessionStoreRedisTests : IAsyncLifetime
{
    private const string RedisVariable = "PREVIEW_TEST_REDIS";

    /// <summary>How far a TTL may be below what was set, for the time the test itself takes.</summary>
    private static readonly TimeSpan s_tolerance = TimeSpan.FromSeconds(30);

    private readonly string _instanceName = $"preview-tests-{Guid.NewGuid():N}:";
    private ConnectionMultiplexer? _redis;
    private RedisCache? _cache;

    public async ValueTask InitializeAsync()
    {
        string? connectionString = Environment.GetEnvironmentVariable(RedisVariable);
        Assert.SkipWhen(string.IsNullOrEmpty(connectionString), $"{RedisVariable} is not set.");

        _redis = await ConnectionMultiplexer.ConnectAsync(connectionString);
        _cache = new RedisCache(
            Options.Create(new RedisCacheOptions { Configuration = connectionString, InstanceName = _instanceName })
        );
    }

    public async ValueTask DisposeAsync()
    {
        _cache?.Dispose();
        if (_redis is not null)
        {
            await _redis.DisposeAsync();
        }
    }

    [Fact]
    public async Task Start_KeepsTheSessionForItsIdleTime()
    {
        SessionId sessionId = await Store().Start(MyApp(), TestContext.Current.CancellationToken);

        TimeSpan timeToLive = await TimeToLive(sessionId);
        Assert.InRange(timeToLive, SessionLifetime.Idle - s_tolerance, SessionLifetime.Idle);
        Assert.Equal(
            MyApp(),
            (await Store().FindAndRenew(sessionId, TestContext.Current.CancellationToken))?.WorkingCopy
        );
    }

    [Fact]
    public async Task FindAndRenew_RestartsTheIdleTime()
    {
        SessionId sessionId = await Store().Start(MyApp(), TestContext.Current.CancellationToken);
        await Database().KeyExpireAsync(Key(sessionId), TimeSpan.FromMinutes(1));

        Assert.NotNull(await Store().FindAndRenew(sessionId, TestContext.Current.CancellationToken));

        Assert.InRange(await TimeToLive(sessionId), SessionLifetime.Idle - s_tolerance, SessionLifetime.Idle);
    }

    [Fact]
    public async Task FindAndRenew_DoesNotKeepASessionPastItsMaximum()
    {
        TimeSpan left = TimeSpan.FromMinutes(10);
        var startedLongAgo = new FakeTimeProvider(DateTimeOffset.UtcNow - SessionLifetime.Maximum + left);
        SessionId sessionId = await Store(startedLongAgo).Start(MyApp(), TestContext.Current.CancellationToken);

        Assert.NotNull(await Store().FindAndRenew(sessionId, TestContext.Current.CancellationToken));

        Assert.InRange(await TimeToLive(sessionId), left - s_tolerance, left);
    }

    [Fact]
    public async Task FindAndRenew_ReturnsNullForASessionThatDoesNotExist()
    {
        Assert.Null(await Store().FindAndRenew(SessionId.New(), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Start_KeepsOnlyAHashOfTheId()
    {
        SessionId sessionId = await Store().Start(MyApp(), TestContext.Current.CancellationToken);

        Assert.True(await Database().KeyExistsAsync(Key(sessionId)));
        Assert.False(await Database().KeyExistsAsync(_instanceName + sessionId.Value));
    }

    private SessionStore Store(TimeProvider? timeProvider = null) =>
        new(_cache ?? throw new InvalidOperationException("Not initialized."), timeProvider ?? TimeProvider.System);

    private IDatabase Database() => (_redis ?? throw new InvalidOperationException("Not initialized.")).GetDatabase();

    private string Key(SessionId sessionId) => _instanceName + sessionId.StorageKey;

    private async Task<TimeSpan> TimeToLive(SessionId sessionId) =>
        await Database().KeyTimeToLiveAsync(Key(sessionId)) ?? throw new InvalidOperationException("No TTL.");

    private static WorkingCopy MyApp() =>
        WorkingCopy.TryCreate("developer", "ttd", "my-app", out WorkingCopy? workingCopy)
            ? workingCopy
            : throw new InvalidOperationException("Invalid working copy.");
}
