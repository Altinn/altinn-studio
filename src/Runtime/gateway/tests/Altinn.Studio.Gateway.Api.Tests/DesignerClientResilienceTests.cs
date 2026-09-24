using Altinn.Studio.Gateway.Api.Clients.Designer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class DesignerClientResilienceTests
{
    private const string ClientName = "designer";
    private static readonly Uri _alertsUri = new("designer/api/v1/admin/alerts/ttd/tt02", UriKind.Relative);

    [Fact]
    public async Task CallerCancellation_IsNotHandledAsTransientFailure()
    {
        using var callerCancellation = new CancellationTokenSource();
        using var handler = new RecordingHandler(async cancellationToken =>
        {
            // Mirrors Grafana closing the webhook request while the gateway waits for a Designer connection.
            await callerCancellation.CancelAsync();
            await Task.Delay(Timeout.Infinite, cancellationToken);
            throw new InvalidOperationException("Unreachable");
        });
        await using var provider = BuildServiceProvider(handler);
        var client = provider.GetRequiredService<IHttpClientFactory>().CreateClient(ClientName);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.PostAsync(_alertsUri, content: null, callerCancellation.Token)
        );

        Assert.Equal(1, handler.Attempts);
        var attempt = Assert.Single(
            provider.GetFakeLogCollector().GetSnapshot(),
            record => record.Message.StartsWith("Execution attempt", StringComparison.Ordinal)
        );
        Assert.Equal(LogLevel.Information, attempt.Level);
        Assert.Contains("Handled: 'False'", attempt.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task TransientFailure_IsRetried()
    {
        using var handler = new RecordingHandler(_ => throw new HttpRequestException("Connection refused"));
        await using var provider = BuildServiceProvider(handler);
        var client = provider.GetRequiredService<IHttpClientFactory>().CreateClient(ClientName);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.PostAsync(_alertsUri, content: null, TestContext.Current.CancellationToken)
        );

        Assert.Equal(4, handler.Attempts);
    }

    private static ServiceProvider BuildServiceProvider(RecordingHandler handler)
    {
        var services = new ServiceCollection();
        services.AddFakeLogging();
        services
            .AddHttpClient(ClientName, client => client.BaseAddress = new Uri("https://designer.example"))
            .ConfigurePrimaryHttpMessageHandler(() => handler)
            .AddStandardResilienceHandler(options =>
            {
                DesignerClientRegistration.ConfigureResilience(options);
                options.Retry.Delay = TimeSpan.Zero;
            });
        return services.BuildServiceProvider();
    }

    private sealed class RecordingHandler(Func<CancellationToken, Task<HttpResponseMessage>> _send) : HttpMessageHandler
    {
        private int _attempts;

        public int Attempts => _attempts;

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Interlocked.Increment(ref _attempts);
            return _send(cancellationToken);
        }
    }
}
