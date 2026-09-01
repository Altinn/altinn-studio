using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http.Resilience;
using Polly.CircuitBreaker;
using Xunit;
using RuntimeGatewayServices = Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.ServiceCollectionExtensions;

namespace Designer.Tests.TypedHttpClients;

/// <summary>
/// Covers the retry narrowing applied to the shared "runtime-gateway" named client: mutating verbs
/// must never be replayed, and the gateway's deliberate 502 ("workflow engine unavailable in this
/// environment") must not be treated as a transient fault.
/// </summary>
public class RuntimeGatewayResilienceTests : IDisposable
{
    // The standard resilience handler retries three times on top of the initial attempt.
    private const int AttemptsWhenRetried = 4;

    // Comfortably more than the lowered minimum throughput the circuit-breaker tests configure, so
    // a breaker that reacts at all has reacted well before the probe run ends.
    private const int CircuitProbeRequests = 25;

    private readonly List<ServiceProvider> _providers = [];

    public void Dispose()
    {
        foreach (ServiceProvider provider in _providers)
        {
            provider.Dispose();
        }

        _providers.Clear();
        GC.SuppressFinalize(this);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.RequestTimeout)]
    public async Task TransientStatus_OnRead_IsRetried(HttpStatusCode statusCode)
    {
        var handler = CountingHandler.Returning(statusCode);
        using HttpClient client = CreateClient(handler);

        using HttpResponseMessage response = await client.GetAsync("http://runtime-gateway.test/probe");

        Assert.Equal(statusCode, response.StatusCode);
        Assert.Equal(AttemptsWhenRetried, handler.Invocations);
    }

    [Fact]
    public async Task TransientException_OnRead_IsRetried()
    {
        var handler = CountingHandler.Throwing(() => new HttpRequestException("connection refused"));
        using HttpClient client = CreateClient(handler);

        await Assert.ThrowsAsync<HttpRequestException>(() => client.GetAsync("http://runtime-gateway.test/probe"));

        Assert.Equal(AttemptsWhenRetried, handler.Invocations);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.RequestTimeout)]
    public async Task TransientStatus_OnMutation_IsNotRetried(HttpStatusCode statusCode)
    {
        var handler = CountingHandler.Returning(statusCode);
        using HttpClient client = CreateClient(handler);

        using HttpResponseMessage response = await client.PostAsync(
            "http://runtime-gateway.test/workflows/resume",
            content: null
        );

        // Replaying a mutation the far side already committed would answer 409 for a call that
        // actually succeeded, and the audit trail would record the failure.
        Assert.Equal(statusCode, response.StatusCode);
        Assert.Equal(1, handler.Invocations);
    }

    [Fact]
    public async Task TransientException_OnMutation_IsNotRetried()
    {
        var handler = CountingHandler.Throwing(() => new HttpRequestException("connection reset"));
        using HttpClient client = CreateClient(handler);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.PostAsync("http://runtime-gateway.test/workflows/abandon", content: null)
        );

        Assert.Equal(1, handler.Invocations);
    }

    [Fact]
    public async Task BadGateway_OnRead_IsNotRetried()
    {
        var handler = CountingHandler.Returning(HttpStatusCode.BadGateway);
        using HttpClient client = CreateClient(handler);

        using HttpResponseMessage response = await client.GetAsync("http://runtime-gateway.test/probe");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Equal(1, handler.Invocations);
    }

    [Theory]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.GatewayTimeout)]
    public async Task OtherServerErrors_OnRead_StayRetryable(HttpStatusCode statusCode)
    {
        var handler = CountingHandler.Returning(statusCode);
        using HttpClient client = CreateClient(handler);

        using HttpResponseMessage response = await client.GetAsync("http://runtime-gateway.test/probe");

        Assert.Equal(statusCode, response.StatusCode);
        Assert.Equal(AttemptsWhenRetried, handler.Invocations);
    }

    [Fact]
    public async Task BadGateway_DoesNotOpenTheCircuit()
    {
        var handler = CountingHandler.Returning(HttpStatusCode.BadGateway);
        using HttpClient client = CreateClient(handler, circuitBreakerMinimumThroughput: 4);

        (int requests, bool circuitOpened) = await SendUntilCircuitOpens(client, HttpMethod.Get, CircuitProbeRequests);

        // The client is shared with deploy, metrics and alerts calls. An admin polling a workflows
        // view in an environment without an engine must not open the circuit on them.
        Assert.False(circuitOpened);
        Assert.Equal(CircuitProbeRequests, requests);
        Assert.Equal(CircuitProbeRequests, handler.Invocations);
    }

    [Theory]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.GatewayTimeout)]
    public async Task OtherServerErrors_StillOpenTheCircuit(HttpStatusCode statusCode)
    {
        var handler = CountingHandler.Returning(statusCode);
        using HttpClient client = CreateClient(handler, circuitBreakerMinimumThroughput: 4);

        (_, bool circuitOpened) = await SendUntilCircuitOpens(client, HttpMethod.Get, CircuitProbeRequests);

        Assert.True(circuitOpened);
    }

    [Fact]
    public async Task TransientException_OnMutation_StillOpensTheCircuit()
    {
        var handler = CountingHandler.Throwing(() => new HttpRequestException("connection refused"));
        using HttpClient client = CreateClient(handler, circuitBreakerMinimumThroughput: 4);

        // Retries are off for mutations, but the breaker must still see their failures.
        (_, bool circuitOpened) = await SendUntilCircuitOpens(client, HttpMethod.Post, CircuitProbeRequests);

        Assert.True(circuitOpened);
    }

    private static async Task<(int Requests, bool CircuitOpened)> SendUntilCircuitOpens(
        HttpClient client,
        HttpMethod method,
        int maxRequests
    )
    {
        for (int request = 1; request <= maxRequests; request++)
        {
            try
            {
                using var message = new HttpRequestMessage(method, "http://runtime-gateway.test/probe");
                using HttpResponseMessage response = await client.SendAsync(message);
            }
            catch (BrokenCircuitException)
            {
                return (request, true);
            }
            catch (HttpRequestException)
            {
                // The stub handler's failure; keep probing until the breaker reacts.
            }
        }

        return (maxRequests, false);
    }

    private HttpClient CreateClient(CountingHandler handler, int? circuitBreakerMinimumThroughput = null)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddRuntimeGatewayHttpClient(
            new ConfigurationBuilder().Build(),
            new StubHostEnvironment { EnvironmentName = Environments.Development }
        );
        services.AddHttpClient(RuntimeGatewayServices.HttpClientName).ConfigurePrimaryHttpMessageHandler(() => handler);

        // Only the backoff delay and — for the circuit-breaker tests — the number of samples the
        // breaker needs before it reacts are neutralized. The predicates under test are left alone.
        services.PostConfigureAll<HttpStandardResilienceOptions>(options =>
        {
            options.Retry.Delay = TimeSpan.Zero;
            options.Retry.UseJitter = false;
            if (circuitBreakerMinimumThroughput is not null)
            {
                options.CircuitBreaker.MinimumThroughput = circuitBreakerMinimumThroughput.Value;
            }
        });

        ServiceProvider provider = services.BuildServiceProvider();
        _providers.Add(provider);

        return provider.GetRequiredService<IHttpClientFactory>().CreateClient(RuntimeGatewayServices.HttpClientName);
    }

    private sealed class CountingHandler : HttpMessageHandler
    {
        private readonly Func<HttpResponseMessage> _respond;
        private int _invocations;

        private CountingHandler(Func<HttpResponseMessage> respond)
        {
            _respond = respond;
        }

        public int Invocations => Volatile.Read(ref _invocations);

        public static CountingHandler Returning(HttpStatusCode statusCode) =>
            new(() => new HttpResponseMessage(statusCode));

        public static CountingHandler Throwing(Func<Exception> exception) => new(() => throw exception());

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Interlocked.Increment(ref _invocations);
            return Task.FromResult(_respond());
        }
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Designer.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
