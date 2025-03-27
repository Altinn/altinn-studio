using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Time.Testing;
using Moq;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using static Altinn.App.Core.Internal.LocaltestValidation;

namespace Altinn.App.Core.Tests.Internal;

public class LocaltestValidationTests
{
    private sealed record Fixture(WebApplication App) : IAsyncDisposable
    {
        internal const string ApiPath = "/Home/Localtest/Version";

        public Mock<IHttpClientFactory> HttpClientFactoryMock =>
            Mock.Get(App.Services.GetRequiredService<IHttpClientFactory>());

        public WireMockServer Server => App.Services.GetRequiredService<WireMockServer>();

        public FakeTimeProvider TimeProvider => App.Services.GetRequiredService<FakeTimeProvider>();

        public LocaltestValidation Validator =>
            App.Services.GetServices<IHostedService>().OfType<LocaltestValidation>().Single();

        private sealed class ReqHandler(Action? onRequest = null) : DelegatingHandler
        {
            protected override Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken
            )
            {
                onRequest?.Invoke();
                return base.SendAsync(request, cancellationToken);
            }
        }

        public static Fixture Create(
            Action<IServiceCollection>? registerCustomAppServices = default,
            Action? onRequest = null
        )
        {
            var server = WireMockServer.Start();

            var mockHttpClientFactory = new Mock<IHttpClientFactory>();
            mockHttpClientFactory
                .Setup(f => f.CreateClient(It.IsAny<string>()))
                .Returns(() => server.CreateClient(new ReqHandler(onRequest)));

            var app = AppBuilder.Build(registerCustomAppServices: services =>
            {
                services.AddSingleton(_ => server);

                services.Configure<PlatformSettings>(settings =>
                {
                    var testUrl = server.Url ?? throw new Exception("Missing server URL");
                    settings.ApiStorageEndpoint = $"{testUrl}{new Uri(settings.ApiStorageEndpoint).PathAndQuery}";
                });

                var fakeTimeProvider = new FakeTimeProvider(new DateTimeOffset(2024, 1, 1, 10, 0, 0, TimeSpan.Zero));
                services.AddSingleton<TimeProvider>(fakeTimeProvider);
                services.AddSingleton(fakeTimeProvider);

                services.AddSingleton(mockHttpClientFactory.Object);

                registerCustomAppServices?.Invoke(services);
            });

            return new Fixture(app);
        }

        public async ValueTask DisposeAsync() => await App.DisposeAsync();
    }

    [Fact]
    public async Task Test_Init()
    {
        await using var fixture = Fixture.Create();

        var service = fixture.Validator;

        Assert.NotNull(service);
    }

    [Fact]
    public async Task Test_Recent_Version()
    {
        await using var fixture = Fixture.Create();

        var expectedVersion = 1;

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "text/plain")
                    .WithBody($"{expectedVersion}")
            );

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        var ok = Assert.IsType<VersionResult.Ok>(result);
        Assert.Equal(expectedVersion, ok.Version);

        var reqs = server.FindLogEntries(Request.Create().WithPath(Fixture.ApiPath).UsingGet());
        Assert.Single(reqs);

        Assert.False(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_Old_Version()
    {
        await using var fixture = Fixture.Create();

        var expectedVersion = 0;

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "text/plain")
                    .WithBody($"{expectedVersion}")
            );

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        var ok = Assert.IsType<VersionResult.Ok>(result);
        Assert.Equal(expectedVersion, ok.Version);

        var reqs = server.FindLogEntries(Request.Create().WithPath(Fixture.ApiPath).UsingGet());
        Assert.Single(reqs);

        Assert.True(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_Api_Not_Found()
    {
        await using var fixture = Fixture.Create();

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(Response.Create().WithStatusCode(404));

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        Assert.IsType<VersionResult.ApiNotFound>(result);

        var reqs = server.FindLogEntries(Request.Create().WithPath(Fixture.ApiPath).UsingGet());
        Assert.Single(reqs);

        Assert.True(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_Invalid_Version()
    {
        await using var fixture = Fixture.Create();

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(
                Response.Create().WithStatusCode(200).WithHeader("Content-Type", "text/plain").WithBody("blah")
            );

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        Assert.IsType<VersionResult.InvalidVersionResponse>(result);

        Assert.False(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_Timeout()
    {
        await using var fixture = Fixture.Create();

        var expectedVersion = 1;
        var delay = TimeSpan.FromSeconds(6);

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "text/plain")
                    .WithBody($"{expectedVersion}")
                    .WithDelay(delay)
            );

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);
        await Task.Delay(10);
        fixture.TimeProvider.Advance(delay);

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        Assert.IsType<VersionResult.Timeout>(result);

        Assert.False(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_App_Shutdown()
    {
        await using var fixture = Fixture.Create();

        var expectedVersion = 1;
        var delay = TimeSpan.FromSeconds(6);

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "text/plain")
                    .WithBody($"{expectedVersion}")
                    .WithDelay(delay)
            );

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);
        await Task.Delay(10);
        fixture.TimeProvider.Advance(delay.Subtract(TimeSpan.FromSeconds(4)));
        lifetime.StopApplication();

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        Assert.IsType<VersionResult.AppShuttingDown>(result);

        Assert.True(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_Dns_Failure()
    {
        await using var fixture = Fixture.Create(registerCustomAppServices: services =>
            services.Configure<PlatformSettings>(settings =>
                settings.ApiStorageEndpoint = ReplaceHost(
                    settings.ApiStorageEndpoint,
                    "provoke-dns-fail.local.not-altinn-at-all.cloud"
                )
            )
        );

        var expectedVersion = 1;

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "text/plain")
                    .WithBody($"{expectedVersion}")
            );

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        var notAvailable = Assert.IsType<VersionResult.ApiNotAvailable>(result);
        Assert.Equal(HttpRequestError.NameResolutionError, notAvailable.Error);

        Assert.False(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_Unhandled_Status()
    {
        await using var fixture = Fixture.Create();

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(Response.Create().WithStatusCode(201));

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        var status = Assert.IsType<VersionResult.UnhandledStatusCode>(result);
        Assert.Equal(HttpStatusCode.Created, status.StatusCode);

        Assert.False(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_Unhandled_Error()
    {
        var errorMessage = "Unhandled error";
        await using var fixture = Fixture.Create(onRequest: () =>
        {
            throw new Exception(errorMessage);
        });

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithHeader("Content-Type", "text/plain").WithBody($"1"));

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);

        var result = await service.Results.FirstAsync();
        Assert.NotNull(result);
        var error = Assert.IsType<VersionResult.UnknownError>(result);
        Assert.Equal(errorMessage, error.Exception.Message);

        Assert.False(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    [Fact]
    public async Task Test_Unhandled_Error_But_Continue_To_Try()
    {
        var errorMessage = "Unhandled error";
        var failCount = 0;
        var expectedVersion = 1;
        await using var fixture = Fixture.Create(onRequest: () =>
        {
            if (failCount++ < 3)
                throw new Exception(errorMessage);
        });

        var server = fixture.Server;
        server
            .Given(Request.Create().WithPath(Fixture.ApiPath).UsingGet())
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "text/plain")
                    .WithBody($"{expectedVersion}")
            );

        var service = fixture.Validator;
        var lifetime = fixture.App.Services.GetRequiredService<IHostApplicationLifetime>();
        await service.StartAsync(lifetime.ApplicationStopping);

        List<VersionResult> results = [];
        await foreach (var result in service.Results)
        {
            fixture.TimeProvider.Advance(TimeSpan.FromSeconds(5));
            results.Add(result);
        }

        Assert.Equal(4, results.Count);
        Assert.All(
            results.Take(3),
            result =>
            {
                Assert.NotNull(result);
                var error = Assert.IsType<VersionResult.UnknownError>(result);
                Assert.Equal(errorMessage, error.Exception.Message);

                Assert.False(lifetime.ApplicationStopping.IsCancellationRequested);
            }
        );

        var ok = Assert.IsType<VersionResult.Ok>(results.Last());
        Assert.Equal(expectedVersion, ok.Version);
        Assert.False(lifetime.ApplicationStopping.IsCancellationRequested);
    }

    private static string ReplaceHost(string original, string newHostName)
    {
        var builder = new UriBuilder(original);
        builder.Host = newHostName;
        return builder.Uri.ToString();
    }
}
