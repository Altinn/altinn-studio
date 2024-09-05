using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Common.Tests;
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
using Microsoft.Extensions.Logging;
using Moq;
using OpenTelemetry;
using OpenTelemetry.Context.Propagation;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests;

public class ApiTestBase
{
    protected static readonly JsonSerializerOptions JsonSerializerOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    protected readonly ITestOutputHelper OutputHelper;
    private readonly WebApplicationFactory<Program> _factory;

    protected IServiceProvider Services { get; private set; }

    protected readonly Func<TestId?, Activity, bool> ActivityFilter = static (thisTestId, activity) =>
    {
        Assert.NotNull(thisTestId);
        var current = activity;
        do
        {
            if (current.GetTagItem(nameof(TestId)) is Guid testId && testId == thisTestId.Value)
                return true;
            current = current.Parent;
        } while (current is not null);

        return false;
    };

    public ApiTestBase(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
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
            return _next(httpContext);
        }
    }

    public HttpClient GetRootedClient(string org, string app, int userId, int? partyId, int authenticationLevel = 2)
    {
        var client = GetRootedClient(org, app);
        string token = PrincipalUtil.GetToken(userId, partyId, authenticationLevel);
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
            var configuration = new ConfigurationBuilder().AddJsonFile(appSettingsPath).Build();

            configuration.GetSection("AppSettings:AppBasePath").Value = appRootPath;
            IConfigurationSection appSettingSection = configuration.GetSection("AppSettings");

            builder.ConfigureLogging(logging => ConfigureFakeLogging(logging, OutputHelper));

            builder.ConfigureServices(services => services.Configure<AppSettings>(appSettingSection));
            builder.ConfigureTestServices(services => OverrideServicesForAllTests(services));
            builder.ConfigureTestServices(OverrideServicesForThisTest);
            builder.ConfigureTestServices(ConfigureFakeHttpClientHandler);
        });
        var services = Services = factory.Services;
        _ = services.GetService<TelemetrySink>(); // The sink starts listening when it is constructed, so we make sure to construct here

        var client = includeTraceContext
            ? factory.CreateDefaultClient(new DiagnosticHandler())
            : factory.CreateClient(new WebApplicationFactoryClientOptions() { AllowAutoRedirect = false });

        return client;
    }

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
                        LogLevel.Critical
                    };
                }
                options.OutputFormatter = log =>
                    $"""
                    [{ShortLogLevel(log.Level)}] {log.Category}:
                    {log.Message}{(log.Exception is not null ? "\n" : "")}{log.Exception}
                    
                    """;
            });
    }

    private static string ShortLogLevel(LogLevel logLevel)
    {
        return logLevel switch
        {
            LogLevel.Trace => "trac",
            LogLevel.Debug => "debu",
            LogLevel.Information => "info",
            LogLevel.Warning => "warn",
            LogLevel.Error => "erro",
            LogLevel.Critical => "crit",
            LogLevel.None => "none",
            _ => "????",
        };
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
                .Returns(sp.GetRequiredService<HttpClient>());
            return clientFactoryMock.Object;
        });
        services.AddSingleton<HttpClient>(sp => new HttpClient(
            new MockHttpMessageHandler(SendAsync, sp.GetRequiredService<ILogger<MockHttpMessageHandler>>())
        ));
    }

    /// <summary>
    /// Set this in your test class constructor
    /// </summary>
    protected async Task<T> VerifyStatusAndDeserialize<T>(
        HttpResponseMessage response,
        HttpStatusCode expectedStatusCode
    )
    {
        // Verify status code
        response.Should().HaveStatusCode(expectedStatusCode);

        // Deserialize content and log everything if it fails
        var content = await response.Content.ReadAsStringAsync();
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

            OutputHelper.WriteLine(JsonUtils.IndentJson(content));
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
