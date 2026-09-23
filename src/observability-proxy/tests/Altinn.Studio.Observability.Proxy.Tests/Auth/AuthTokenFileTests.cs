using System.Net;
using Altinn.Studio.Observability.Proxy.Auth;
using Altinn.Studio.Observability.Proxy.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Observability.Proxy.Tests.Auth;

public sealed class AuthTokenFileTests : IDisposable
{
    private readonly string _path = Path.Combine(Path.GetTempPath(), $"auth-tokens-{Guid.NewGuid():N}.json");

    [Fact]
    public void IngestAndQueryTokens_GetTheRouteGroupsTheirGroupNames()
    {
        Write(
            """
            { "ingest": { "runtime_prod": ["ingest-secret"] }, "query": { "grafana": ["query-secret"] } }
            """
        );

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
        Write(
            """
            { "superuser": { "someone": ["secret"] } }
            """
        );

        Assert.Empty(CreateTokenFile(out _).GetTokens());
    }

    [Fact]
    public void RotatedFile_IsPickedUpAfterTheReloadInterval()
    {
        // Rotation as Kubernetes performs it: a token of the same length, and no change the file's
        // own metadata can be trusted to show, because a mounted Secret is a swapped symlink.
        // Detecting the change by size or timestamp silently never reloads.
        Write(
            """
            { "ingest": { "runtime_prod": ["1111111111111111"] } }
            """
        );
        var tokenFile = CreateTokenFile(out var timeProvider);
        Assert.Equal("1111111111111111", tokenFile.GetTokens().Single().Token);
        var originalLength = new FileInfo(_path).Length;
        var originalWriteTime = File.GetLastWriteTimeUtc(_path);

        Write(
            """
            { "ingest": { "runtime_prod": ["2222222222222222"] } }
            """
        );
        File.SetLastWriteTimeUtc(_path, originalWriteTime);
        Assert.Equal(originalLength, new FileInfo(_path).Length);

        // Still cached inside the interval, re-read once it has passed.
        Assert.Equal("1111111111111111", tokenFile.GetTokens().Single().Token);
        timeProvider.Advance(TimeSpan.FromSeconds(31));
        Assert.Equal("2222222222222222", tokenFile.GetTokens().Single().Token);
    }

    [Fact]
    public void TwoIdentitiesSharingOneTokenValue_AreReported()
    {
        // The authenticator keeps the last match, so a copy-pasted token silently attributes one
        // source's telemetry to another. The warning names both identities and never the token.
        Write(
            """
            { "ingest": { "studio_dev": ["shared-secret"], "studio_staging": ["shared-secret"] } }
            """
        );
        var logger = new RecordingLogger();

        Assert.Equal(2, CreateTokenFile(out _, logger).GetTokens().Count);

        var warning = Assert.Single(logger.Warnings);
        Assert.Contains("studio_dev", warning, StringComparison.Ordinal);
        Assert.Contains("studio_staging", warning, StringComparison.Ordinal);
        Assert.DoesNotContain("shared-secret", warning, StringComparison.Ordinal);
    }

    [Fact]
    public void TwoTokensForOneIdentity_AreBothAcceptedAndToldApartByTag()
    {
        // The rotation overlap: the old and the new token are accepted for the same identity, and
        // the tag in the request log is what shows which one a source has moved to.
        Write(
            """
            { "ingest": { "runtime_prod": ["old-secret", "new-secret"] } }
            """
        );
        var authenticator = new StaticBearerTokenAuthenticator(
            new StaticOptionsMonitor(OptionsFor(_path)),
            CreateTokenFile(out _)
        );

        Assert.True(authenticator.TryAuthenticate("Bearer old-secret", out var oldSource));
        Assert.True(authenticator.TryAuthenticate("Bearer new-secret", out var newSource));

        Assert.Equal("runtime_prod", oldSource.SourceIdentity);
        Assert.Equal("runtime_prod", newSource.SourceIdentity);
        Assert.Equal(TokenTag.Of("old-secret"), oldSource.TokenTag);
        Assert.Equal(TokenTag.Of("new-secret"), newSource.TokenTag);
        Assert.NotEqual(oldSource.TokenTag, newSource.TokenTag);
    }

    [Fact]
    public void SameTokenTwiceForOneIdentity_IsOneTokenAndNotReported()
    {
        // Outside a rotation both slots hold the current token. That is the normal state, so it
        // must not warn on every reload.
        Write(
            """
            { "ingest": { "runtime_prod": ["current-secret", "current-secret"] } }
            """
        );
        var logger = new RecordingLogger();

        var token = Assert.Single(CreateTokenFile(out _, logger).GetTokens());

        Assert.Equal("current-secret", token.Token);
        Assert.Empty(logger.Warnings);
    }

    [Fact]
    public void TokenTag_IsTheStartOfTheSha256()
    {
        // Operators compute the same value from the vault with sha256sum, so the tag must stay a
        // plain prefix of the lowercase hex digest.
        Assert.Equal("ba7816bf", TokenTag.Of("abc"));
    }

    [Fact]
    public void MalformedFile_KeepsTheTokensAlreadyLoaded()
    {
        // Replacing every token with nothing would turn one bad Secret into an outage for all
        // sources at once.
        Write(
            """
            { "ingest": { "runtime_prod": ["first-secret"] } }
            """
        );
        var tokenFile = CreateTokenFile(out var timeProvider);
        Assert.Single(tokenFile.GetTokens());

        File.WriteAllText(_path, "{ this is not json");
        timeProvider.Advance(TimeSpan.FromSeconds(31));

        Assert.Equal("first-secret", tokenFile.GetTokens().Single().Token);
    }

    [Fact]
    public async Task TokenFromTheMountedFile_IsAcceptedAndScopedToItsGroup()
    {
        Write(
            """
            { "ingest": { "runtime_prod": ["mounted-ingest-token"] } }
            """
        );
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

    private void Write(string json)
    {
        File.WriteAllText(_path, json);
    }

    private static ObservabilityProxyOptions OptionsFor(string path)
    {
        var options = new ObservabilityProxyOptions();
        options.Authentication.TokensFilePath = path;
        return options;
    }

    private AuthTokenFile CreateTokenFile(out TestTimeProvider timeProvider, ILogger<AuthTokenFile>? logger = null)
    {
        var options = OptionsFor(_path);
        timeProvider = new TestTimeProvider();

        return new AuthTokenFile(
            new StaticOptionsMonitor(options),
            logger ?? NullLogger<AuthTokenFile>.Instance,
            timeProvider
        );
    }

    private sealed class RecordingLogger : ILogger<AuthTokenFile>
    {
        public List<string> Warnings { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        )
        {
            ArgumentNullException.ThrowIfNull(formatter);

            if (logLevel == LogLevel.Warning)
            {
                Warnings.Add(formatter(state, exception));
            }
        }
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
