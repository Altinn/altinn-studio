using Altinn.Studio.Preview.AppApi;
using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;
using Microsoft.Extensions.Time.Testing;
using StackExchange.Redis;

namespace Altinn.Studio.Preview.Tests.Sessions;

/// <summary>
/// The session lifetime and state changes as Redis keeps them, so these run against a real Redis. Set
/// <c>PREVIEW_TEST_REDIS</c> to its connection string, such as <c>localhost:6379</c>, to run them. CI does.
/// </summary>
public sealed class SessionStoreRedisTests : IAsyncLifetime
{
    private const string RedisVariable = "PREVIEW_TEST_REDIS";

    /// <summary>How far a TTL may be below what was set, for the time the test itself takes.</summary>
    private static readonly TimeSpan s_tolerance = TimeSpan.FromSeconds(30);

    private ConnectionMultiplexer? _redis;

    public async ValueTask InitializeAsync()
    {
        string? connectionString = Environment.GetEnvironmentVariable(RedisVariable);
        Assert.SkipWhen(string.IsNullOrEmpty(connectionString), $"{RedisVariable} is not set.");

        _redis = await ConnectionMultiplexer.ConnectAsync(connectionString);
    }

    public async ValueTask DisposeAsync()
    {
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
        Assert.False(await Database().KeyExistsAsync(SessionStore.KeyPrefix + sessionId.Value));
    }

    [Fact]
    public async Task Update_KeepsTheStateInTheSessionsKey()
    {
        SessionId sessionId = await Store().Start(MyApp(), TestContext.Current.CancellationToken);
        Guid instanceGuid = Guid.NewGuid();

        StateChange<Guid>? change = await Store()
            .Update(sessionId, state => AddInstance(state, instanceGuid), TestContext.Current.CancellationToken);

        Assert.Equal(instanceGuid, change?.Result);
        MockState? state = await Store().ReadState(sessionId, TestContext.Current.CancellationToken);
        Assert.Equal([instanceGuid], state?.Instances.Keys);
        Assert.Equal(["revision", "session", "state"], (await Database().HashKeysAsync(Key(sessionId))).Order());
    }

    [Fact]
    public async Task Update_KeepsEveryChange_WhenRequestsChangeTheStateAtOnce()
    {
        SessionId sessionId = await Store().Start(MyApp(), TestContext.Current.CancellationToken);
        Guid[] instanceGuids = [.. Enumerable.Range(0, 8).Select(_ => Guid.NewGuid())];

        await Task.WhenAll(
            instanceGuids.Select(instanceGuid =>
                Store()
                    .Update(sessionId, state => AddInstance(state, instanceGuid), TestContext.Current.CancellationToken)
            )
        );

        MockState? state = await Store().ReadState(sessionId, TestContext.Current.CancellationToken);
        Assert.Equal(instanceGuids.Order(), state?.Instances.Keys.Order());
    }

    [Fact]
    public async Task Update_ReturnsNullForASessionThatHasEnded()
    {
        SessionId sessionId = await Store().Start(MyApp(), TestContext.Current.CancellationToken);
        await Database().KeyDeleteAsync(Key(sessionId));

        StateChange<Guid>? change = await Store()
            .Update(sessionId, state => AddInstance(state, Guid.NewGuid()), TestContext.Current.CancellationToken);

        Assert.Null(change);
        Assert.False(await Database().KeyExistsAsync(Key(sessionId)));
    }

    private static Guid AddInstance(MockState state, Guid instanceGuid)
    {
        state.Instances[instanceGuid] = new MockInstance
        {
            Instance = new Instance
            {
                Id = $"51001/{instanceGuid}",
                InstanceOwner = new InstanceOwner("51001"),
                AppId = "ttd/my-app",
                Org = "ttd",
                Created = DateTimeOffset.UtcNow,
                LastChanged = DateTimeOffset.UtcNow,
                Process = new ProcessState { Started = DateTimeOffset.UtcNow },
            },
        };
        return instanceGuid;
    }

    private SessionStore Store(TimeProvider? timeProvider = null) =>
        new(_redis ?? throw new InvalidOperationException("Not initialized."), timeProvider ?? TimeProvider.System);

    private IDatabase Database() => (_redis ?? throw new InvalidOperationException("Not initialized.")).GetDatabase();

    private static string Key(SessionId sessionId) => SessionStore.KeyPrefix + sessionId.StorageKey;

    private async Task<TimeSpan> TimeToLive(SessionId sessionId) =>
        await Database().KeyTimeToLiveAsync(Key(sessionId)) ?? throw new InvalidOperationException("No TTL.");

    private static WorkingCopy MyApp() =>
        WorkingCopy.TryCreate("developer", "ttd", "my-app", out WorkingCopy? workingCopy)
            ? workingCopy
            : throw new InvalidOperationException("Invalid working copy.");
}
