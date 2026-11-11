using System.Diagnostics;
using System.Net;
using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Tests;

public sealed class HealthTests
{
    [Fact]
    public async Task Ready_IsUnavailable_WhenTheSessionStoreIsDown()
    {
        using var factory = new PreviewApplicationFactory(new UnavailableSessionStore());

        using HttpResponseMessage response = await GetHealth(factory, "/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    // A check that waits on its store would otherwise hang the test run.
    [Fact(Timeout = 10_000)]
    public async Task Ready_AnswersBeforeTheProbeTimesOut_WhenTheSessionStoreHangs()
    {
        using var factory = new PreviewApplicationFactory(new HangingSessionStore());
        var stopwatch = Stopwatch.StartNew();

        using HttpResponseMessage response = await GetHealth(factory, "/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        // The readiness probe's timeout in infra/kustomize/base/deployment.yaml.
        Assert.InRange(stopwatch.Elapsed, TimeSpan.Zero, TimeSpan.FromSeconds(3));
    }

    [Fact]
    public async Task Live_IsOk_WhenTheSessionStoreIsDown()
    {
        using var factory = new PreviewApplicationFactory(new UnavailableSessionStore());

        using HttpResponseMessage response = await GetHealth(factory, "/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static Task<HttpResponseMessage> GetHealth(PreviewApplicationFactory factory, string path) =>
        factory.CreatePublicClient().GetAsync(new Uri(path, UriKind.Relative), TestContext.Current.CancellationToken);

    /// <summary>
    /// A session store that never answers, as Redis's client does while it connects to a Redis that is gone.
    /// </summary>
    private sealed class HangingSessionStore : ISessionStore
    {
        public Task<SessionId> Start(WorkingCopy workingCopy, CancellationToken cancellationToken) =>
            new TaskCompletionSource<SessionId>().Task;

        public Task<PreviewSession?> FindAndRenew(SessionId sessionId, CancellationToken cancellationToken) =>
            new TaskCompletionSource<PreviewSession?>().Task;

        public Task<MockState?> ReadState(SessionId sessionId, CancellationToken cancellationToken) =>
            new TaskCompletionSource<MockState?>().Task;

        public Task<StateChange<T>?> Update<T>(
            SessionId sessionId,
            Func<MockState, T> change,
            CancellationToken cancellationToken
        ) => new TaskCompletionSource<StateChange<T>?>().Task;

        public Task CheckReachable(CancellationToken cancellationToken) => new TaskCompletionSource().Task;
    }
}
