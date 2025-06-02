using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Configuration;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using OpenTelemetry;
using OpenTelemetry.Context.Propagation;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests;

public class ApiTestBase
{
    internal static readonly JsonSerializerOptions JsonSerializerOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    protected readonly ITestOutputHelper OutputHelper;
    protected string? OverrideEnvironment { get; set; }
    private readonly WebApplicationFactory<Program> _factory;

    protected IServiceProvider Services { get; private set; }

    protected ApiTestBase(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
    {
        _factory = factory;
        Services = _factory.Services;
        OutputHelper = outputHelper;
    }

    internal class ApiTestBaseStartupFilter : IStartupFilter
    {
        private readonly TestId _testId;

        public ApiTestBaseStartupFilter(TestId testId) => _testId = testId;

        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
        {
            return builder =>
            {
                builder.UseMiddleware<AddTestIdTagMiddleware>(_testId.Value);
                next(builder);
            };
        }
    }

    private sealed class AddTestIdTagMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly Guid _testId;

        public AddTestIdTagMiddleware(RequestDelegate next, Guid testId)
        {
            _next = next;
            _testId = testId;
        }

        public Task Invoke(HttpContext httpContext)
        {
            var activity = httpContext.Features.GetRequiredFeature<IHttpActivityFeature>()?.Activity;
            if (activity is not null)
            {
                activity.AddTag(nameof(TestId), _testId);
            }
            var metrics = httpContext.Features.Get<IHttpMetricsTagsFeature>();
            if (metrics is not null)
            {
                metrics.Tags.Add(new KeyValuePair<string, object?>(nameof(TestId), _testId));
            }
            return _next(httpContext);
        }
    }

    public HttpClient GetRootedUserClient(
        string org,
        string app,
        int userId = TestAuthentication.DefaultUserId,
        int partyId = TestAuthentication.DefaultUserPartyId,
        int authenticationLevel = TestAuthentication.DefaultUserAuthenticationLevel
    )
    {
        var client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId, partyId, authenticationLevel);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public HttpClient GetRootedOrgClient(
        string org,
        string app,
        string orgNumber = TestAuthentication.DefaultOrgNumber,
        string scope = TestAuthentication.DefaultServiceOwnerScope,
        string serviceOwnerOrg = TestAuthentication.DefaultOrg
    )
    {
        var client = GetRootedClient(org, app);
        string token = TestAuthentication.GetServiceOwnerToken(orgNumber, org: serviceOwnerOrg, scope: scope);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    /// <summary>
    /// Gets a client that adds appsettings from the specified org/app
    /// test application under TestData/Apps to the service collection.
    /// </summary>
    public HttpClient GetRootedClient(string org, string app, bool includeTraceContext = false)
    {
        string appRootPath = TestData.GetApplicationDirectory(org, app);
        string appSettingsPath = Path.Join(appRootPath, "appsettings.json");

        var factory = _factory.WithWebHostBuilder(builder =>
        {
            var configuration = new ConfigurationBuilder()
                .AddJsonFile(appSettingsPath)
                .AddInMemoryCollection(_configOverrides)
                .Build();

            configuration.GetSection("AppSettings:AppBasePath").Value = appRootPath;
            IConfigurationSection appSettingSection = configuration.GetSection("AppSettings");

            builder.ConfigureLogging(logging => ConfigureFakeLogging(logging, OutputHelper));

            builder.ConfigureServices(services => services.Configure<AppSettings>(appSettingSection));
            builder.ConfigureTestServices(services => OverrideServicesForAllTests(services));
            builder.ConfigureTestServices(OverrideServicesForThisTest);
            builder.ConfigureTestServices(ConfigureFakeHttpClientHandler);
            // Mock IHostEnvironment to return the environment name we want to test
            if (OverrideEnvironment is not null)
            {
                builder.ConfigureTestServices(services =>
                {
                    var hostEnvironmentMock = new Mock<IHostEnvironment>(MockBehavior.Strict);

                    hostEnvironmentMock.SetupGet(e => e.EnvironmentName).Returns(() => OverrideEnvironment);
                    hostEnvironmentMock.SetupGet(e => e.ApplicationName).Returns("Altinn.App.Api");
                    hostEnvironmentMock.SetupGet(e => e.ContentRootPath).Returns(appRootPath);

                    services.Replace(ServiceDescriptor.Singleton(hostEnvironmentMock.Object));
                });
            }
        });
        var services = Services = factory.Services;
        _ = services.GetService<TelemetrySink>(); // The sink starts listening when it is constructed, so we make sure to construct here

        var client = includeTraceContext
            ? factory.CreateDefaultClient(new DiagnosticHandler())
            : factory.CreateClient(new WebApplicationFactoryClientOptions() { AllowAutoRedirect = false });

        return client;
    }

    /// <summary>
    /// Overrides the app settings for the test application.
    /// </summary>
    public void OverrideAppSetting(string key, string? value)
    {
        _configOverrides[key] = value;
    }

    private readonly Dictionary<string, string?> _configOverrides = new();

    private sealed class DiagnosticHandler : DelegatingHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            var activity = Activity.Current;
            var propagator = Propagators.DefaultTextMapPropagator;
            if (activity is not null)
            {
                propagator.Inject(
                    new PropagationContext(activity.Context, Baggage.Current),
                    request.Headers,
                    (c, k, v) => c.TryAddWithoutValidation(k, v)
                );
                Assert.Contains(request.Headers, h => h.Key == "traceparent"); // traceparent is mandatory in W3C
            }
            return base.SendAsync(request, cancellationToken);
        }
    }

    public static void ConfigureFakeLogging(ILoggingBuilder builder, ITestOutputHelper? outputHelper = null)
    {
        builder
            .ClearProviders()
            .AddFakeLogging(options =>
            {
                options.OutputSink = message => outputHelper?.WriteLine(message);
                if (outputHelper is null)
                {
                    options.FilteredLevels = new HashSet<LogLevel>
                    {
                        LogLevel.Warning,
                        LogLevel.Error,
                        LogLevel.Critical,
                    };
                }
                options.OutputFormatter = FakeLoggerXunit.OutputFormatter;
            });
    }

    private void ConfigureFakeHttpClientHandler(IServiceCollection services)
    {
        // Remove existing IHttpClientFactory and HttpClient
        var httpClientFactoryDescriptor = services.Single(d => d.ServiceType == typeof(IHttpClientFactory));
        services.Remove(httpClientFactoryDescriptor);

        var httpClientDescriptor = services.Single(d => d.ServiceType == typeof(HttpClient));
        services.Remove(httpClientDescriptor);

        // Add the new HttpClient as singleton
        services.AddSingleton<IHttpClientFactory>(sp =>
        {
            // Create an HttpClient using the mocked handler
            var clientFactoryMock = new Mock<IHttpClientFactory>(MockBehavior.Strict);
            clientFactoryMock
                .Setup(f => f.CreateClient(It.IsAny<string>()))
                .Returns(() => sp.GetRequiredService<HttpClient>());
            return clientFactoryMock.Object;
        });
        services.AddTransient<HttpClient>(sp => new HttpClient(
            new MockHttpMessageHandler(SendAsync, sp.GetRequiredService<ILogger<MockHttpMessageHandler>>())
        ));
    }

    /// <summary>
    /// Helper to quickly verify the status code and deserialize the content of a response.
    /// and print the content to output helper
    /// </summary>
    protected async Task<T> VerifyStatusAndDeserialize<T>(
        HttpResponseMessage response,
        HttpStatusCode expectedStatusCode
    )
    {
        // Deserialize content and log everything if it fails
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(
            $"{response.RequestMessage?.Method} {response.RequestMessage?.RequestUri?.PathAndQuery}"
        );
        OutputHelper.WriteLine(JsonUtils.IndentJson(content));
        // Verify status code
        response.Should().HaveStatusCode(expectedStatusCode);
        try
        {
            return JsonSerializer.Deserialize<T>(content, JsonSerializerOptions)
                ?? throw new JsonException("Content was \"null\"");
        }
        catch (Exception)
        {
            OutputHelper.WriteLine(string.Empty);
            OutputHelper.WriteLine(string.Empty);
            OutputHelper.WriteLine(
                $"Failed to deserialize content of {response.RequestMessage?.Method} request to {response.RequestMessage?.RequestUri} as {ReflectionUtils.GetTypeNameWithGenericArguments<T>()}:"
            );
            OutputHelper.WriteLine(string.Empty);
            throw;
        }
    }

    /// <summary>
    /// Set this in your test class constructor to make the same overrides for all tests.
    /// </summary>
    protected Action<IServiceCollection> OverrideServicesForAllTests { get; set; } = (services) => { };

    /// <summary>
    /// Set this within a test to override the service just for that test.
    /// </summary>
    protected Action<IServiceCollection> OverrideServicesForThisTest { get; set; } = (services) => { };

    /// <summary>
    /// Set this to customize the response of HttpClient in your test.
    /// </summary>
    protected Func<HttpRequestMessage, Task<HttpResponseMessage>> SendAsync { get; set; } =
        (request) =>
            throw new NotImplementedException("You must set SendAsync in your test when it uses a real http client.");
}
