using System.Net;
using System.Text.Json;
using Altinn.Studio.Observability.Proxy.Auth;
using Altinn.Studio.Observability.Proxy.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Observability.Proxy.Tests.Auth;

public sealed class AuthTokenFileTests : IDisposable
{
    private readonly string _path = Path.Combine(Path.GetTempPath(), $"auth-tokens-{Guid.NewGuid():N}.json");

    [Fact]
    public void IngestAndQueryTokens_GetTheRouteGroupsTheirGroupNames()
    {
        Write(new { ingest = new { runtime_prod = "ingest-secret" }, query = new { grafana = "query-secret" } });

        var tokens = CreateTokenFile(out _).GetTokens();

        var ingest = Assert.Single(tokens, token => token.SourceIdentity == "runtime_prod");
        Assert.Equal("ingest-secret", ingest.Token);
        Assert.Equal(["otlp"], ingest.AllowedRouteGroups);

        var query = Assert.Single(tokens, token => token.SourceIdentity == "grafana");
        Assert.Equal(["traces", "metrics", "logs"], query.AllowedRouteGroups);
    }

    [Fact]
    public void UnknownAccessGroup_GrantsNothing()
    {
        // A typo in the Secret must narrow access, never widen it.
        Write(new { superuser = new { someone = "secret" } });

        Assert.Empty(CreateTokenFile(out _).GetTokens());
    }

    [Fact]
    public void RotatedFile_IsPickedUpAfterTheReloadInterval()
    {
        // Rotation as Kubernetes performs it: a token of the same length, and no change the file's
        // own metadata can be trusted to show, because a mounted Secret is a swapped symlink.
        // Detecting the change by size or timestamp silently never reloads.
        Write(new { ingest = new { runtime_prod = "1111111111111111" } });
        var tokenFile = CreateTokenFile(out var timeProvider);
        Assert.Equal("1111111111111111", tokenFile.GetTokens().Single().Token);
        var originalLength = new FileInfo(_path).Length;
        var originalWriteTime = File.GetLastWriteTimeUtc(_path);

        Write(new { ingest = new { runtime_prod = "2222222222222222" } });
        File.SetLastWriteTimeUtc(_path, originalWriteTime);
        Assert.Equal(originalLength, new FileInfo(_path).Length);

        // Still cached inside the interval, re-read once it has passed.
        Assert.Equal("1111111111111111", tokenFile.GetTokens().Single().Token);
        timeProvider.Advance(TimeSpan.FromSeconds(31));
        Assert.Equal("2222222222222222", tokenFile.GetTokens().Single().Token);
    }

    [Fact]
    public void MalformedFile_KeepsTheTokensAlreadyLoaded()
    {
        // Replacing every token with nothing would turn one bad Secret into an outage for all
        // sources at once.
        Write(new { ingest = new { runtime_prod = "first-secret" } });
        var tokenFile = CreateTokenFile(out var timeProvider);
        Assert.Single(tokenFile.GetTokens());

        File.WriteAllText(_path, "{ this is not json");
        timeProvider.Advance(TimeSpan.FromSeconds(31));

        Assert.Equal("first-secret", tokenFile.GetTokens().Single().Token);
    }

    [Fact]
    public async Task TokenFromTheMountedFile_IsAcceptedAndScopedToItsGroup()
    {
        Write(new { ingest = new { runtime_prod = "mounted-ingest-token" } });
        await using var downstream = await TestWebApplication.StartDownstreamAsync();
        await using var proxy = await TestWebApplication.StartProxyAsync(
            new Dictionary<string, string?>
            {
                ["ObservabilityProxy:Authentication:TokensFilePath"] = _path,
                ["ObservabilityProxy:Downstreams:Agents:Traces"] = downstream.Address,
                ["ObservabilityProxy:Downstreams:Storage:Traces:0"] = downstream.Address,
            }
        );

        using var write = new HttpRequestMessage(HttpMethod.Post, "/internal/observability/otlp/v1/traces");
        write.Headers.Authorization = new("Bearer", "mounted-ingest-token");
        using var writeResponse = await proxy.Client.SendAsync(write, TestContext.Current.CancellationToken);
        writeResponse.EnsureSuccessStatusCode();

        using var read = new HttpRequestMessage(HttpMethod.Get, "/internal/observability/traces/api/v2/search/tags");
        read.Headers.Authorization = new("Bearer", "mounted-ingest-token");
        using var readResponse = await proxy.Client.SendAsync(read, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, readResponse.StatusCode);
    }

    public void Dispose()
    {
        File.Delete(_path);
    }

    private void Write(object content)
    {
        File.WriteAllText(_path, JsonSerializer.Serialize(content));
    }

    private AuthTokenFile CreateTokenFile(out TestTimeProvider timeProvider)
    {
        var options = new ObservabilityProxyOptions();
        options.Authentication.TokensFilePath = _path;
        timeProvider = new TestTimeProvider();

        return new AuthTokenFile(new StaticOptionsMonitor(options), NullLogger<AuthTokenFile>.Instance, timeProvider);
    }

    private sealed class TestTimeProvider : TimeProvider
    {
        private DateTimeOffset _now = new(2026, 9, 21, 12, 0, 0, TimeSpan.Zero);

        public override DateTimeOffset GetUtcNow() => _now;

        public void Advance(TimeSpan amount) => _now = _now.Add(amount);
    }

    private sealed class StaticOptionsMonitor : IOptionsMonitor<ObservabilityProxyOptions>
    {
        public StaticOptionsMonitor(ObservabilityProxyOptions value) => CurrentValue = value;

        public ObservabilityProxyOptions CurrentValue { get; }

        public ObservabilityProxyOptions Get(string? name) => CurrentValue;

        public IDisposable? OnChange(Action<ObservabilityProxyOptions, string?> listener) => null;
    }
}
