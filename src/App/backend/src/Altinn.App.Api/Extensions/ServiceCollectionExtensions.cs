using System.Diagnostics;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Controllers.Attributes;
using Altinn.App.Api.Controllers.Conventions;
using Altinn.App.Api.Helpers;
using Altinn.App.Api.Helpers.Patch;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Infrastructure.Health;
using Altinn.App.Api.Infrastructure.Middleware;
using Altinn.App.Api.Infrastructure.Telemetry;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Cache;
using Altinn.App.Core.Features.Correspondence.Extensions;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Clients;
using AltinnCore.Authentication.JwtCookie;
using Azure.Monitor.OpenTelemetry.Exporter;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.FeatureManagement;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry;
using OpenTelemetry.Context.Propagation;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Swashbuckle.AspNetCore.SwaggerUI;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Class for registering required services to run an Altinn application.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Add the controllers and views used by an Altinn application
    /// </summary>
    public static void AddAltinnAppControllersWithViews(this IServiceCollection services)
    {
        // We add this here because it uses a hosted service and we want it to run as early as possible
        // so that consumers of the cache can rely on it being available.
        services.AddAppConfigurationCache();

        // Add API controllers from Altinn.App.Api
        IMvcBuilder mvcBuilder = services.AddControllersWithViews(options =>
        {
            options.Filters.Add<TelemetryEnrichingResultFilter>();
            options.Conventions.Add(new AltinnControllerConventions());
        });

        services.AddScopeAuthorization();

        mvcBuilder
            .AddApplicationPart(typeof(InstancesController).Assembly)
            .AddXmlSerializerFormatters()
            .AddJsonOptions(
                JsonSettingNames.AltinnApi,
                options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                }
            )
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            });
    }

    /// <summary>
    /// Adds all services to run an Altinn application.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> being built.</param>
    /// <param name="config">A reference to the current <see cref="IConfiguration"/> object.</param>
    /// <param name="env">A reference to the current <see cref="IWebHostEnvironment"/> object.</param>
    public static void AddAltinnAppServices(
        this IServiceCollection services,
        IConfiguration config,
        IWebHostEnvironment env
    )
    {
        services.AddMemoryCache();
        services.AddHealthChecks().AddCheck<HealthCheck>("default_health_check");
        services.AddFeatureManagement();

        services.AddPlatformServices(config, env);
        services.AddAppServices(config, env);
        services.ConfigureDataProtection();

        var useOpenTelemetrySetting = config.GetValue<bool?>("AppSettings:UseOpenTelemetry");

        // Use Application Insights as default, opt in to use Open Telemetry
        if (useOpenTelemetrySetting is true)
        {
            AddOpenTelemetry(services, config, env);
        }
        else
        {
            AddApplicationInsights(services, config, env);
        }

        // AddMaskinportenClient adds a keyed service. This needs to happen after AddApplicationInsights,
        // due to a bug in app insights: https://github.com/microsoft/ApplicationInsights-dotnet/issues/2828
        services.AddMaskinportenClient();
        services.AddCorrespondenceClient();

        AddAuthenticationScheme(services, config, env);
        AddAuthorizationPolicies(services);
        AddAntiforgery(services);

        services.AddSingleton<IAuthorizationHandler, AppAccessHandler>();
        services.AddTransient<InternalPatchService>();

        services.Configure<KestrelServerOptions>(options =>
        {
            options.AllowSynchronousIO = true;
        });

        // HttpClients for platform functionality. Registered as HttpClient so default HttpClientFactory is used
        services.AddHttpClient<AuthorizationApiClient>();

        services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

        services.AddSwaggerFilter();

        // Add swagger endpoint for end user system api documentation
        var appId = StartupHelper.GetApplicationId();
        services.Configure<SwaggerUIOptions>(c =>
        {
            c.SwaggerEndpoint($"/{appId}/v1/customOpenapi.json", $"End user app API for {appId}");
        });
    }

    /// <summary>
    /// <p>Configures the <see cref="MaskinportenClient"/> service with a configuration object which will be static for the lifetime of the service.</p>
    /// <p>If you have already provided a <see cref="MaskinportenSettings"/> configuration, either manually or
    /// implicitly via <see cref="WebHostBuilderExtensions.ConfigureAppWebHost"/>, this will be overridden.</p>
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configureOptions">
    /// Action delegate that provides <see cref="MaskinportenSettings"/> configuration for the <see cref="MaskinportenClient"/> service
    /// </param>
    public static IServiceCollection ConfigureMaskinportenClient(
        this IServiceCollection services,
        Action<MaskinportenSettings> configureOptions
    ) =>
        Altinn.App.Core.Features.Maskinporten.Extensions.ServiceCollectionExtensions.ConfigureMaskinportenClient(
            services,
            configureOptions
        );

    /// <summary>
    /// <p>Binds a <see cref="MaskinportenClient"/> configuration to the supplied config section path.</p>
    /// <p>If you have already provided a <see cref="MaskinportenSettings"/> configuration, either manually or
    /// implicitly via <see cref="WebHostBuilderExtensions.ConfigureAppWebHost"/>, this will be overridden.</p>
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configSectionPath">The configuration section path (Eg. "MaskinportenSettings")</param>
    public static IServiceCollection ConfigureMaskinportenClient(
        this IServiceCollection services,
        string configSectionPath
    ) =>
        Altinn.App.Core.Features.Maskinporten.Extensions.ServiceCollectionExtensions.ConfigureMaskinportenClient(
            services,
            configSectionPath
        );

    /// <summary>
    /// Adds Application Insights to the service collection.
    /// </summary>
    /// <param name="services">Services</param>
    /// <param name="config">Config</param>
    /// <param name="env">Environment</param>
    internal static void AddApplicationInsights(
        IServiceCollection services,
        IConfiguration config,
        IWebHostEnvironment env
    )
    {
        var (applicationInsightsKey, applicationInsightsConnectionString) = GetAppInsightsConfig(config, env);

        if (!string.IsNullOrEmpty(applicationInsightsKey) || !string.IsNullOrEmpty(applicationInsightsConnectionString))
        {
            services.AddApplicationInsightsTelemetry(
                (options) =>
                {
                    if (string.IsNullOrEmpty(applicationInsightsConnectionString))
                    {
#pragma warning disable CS0618 // Type or member is obsolete
                        // Set instrumentationKey for compatibility if connectionString does not exist.
                        options.InstrumentationKey = applicationInsightsKey;
#pragma warning restore CS0618 // Type or member is obsolete
                    }
                    else
                    {
                        options.ConnectionString = applicationInsightsConnectionString;
                    }
                }
            );
            services.AddApplicationInsightsTelemetryProcessor<IdentityTelemetryFilter>();
            services.AddApplicationInsightsTelemetryProcessor<HealthTelemetryFilter>();
            services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
        }
    }

    private static void AddOpenTelemetry(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
    {
        var appId = StartupHelper.GetApplicationId().Split("/")[1];
        var appVersion = config.GetSection("AppSettings").GetValue<string>("AppVersion");
        var isTest = config.GetSection("GeneralSettings").GetValue<bool>("IsTest");
        if (string.IsNullOrWhiteSpace(appVersion))
        {
            appVersion = "Local";
        }
        services.AddHostedService<TelemetryInitialization>();
        services.AddSingleton<Telemetry>();

        // This bit of code makes ASP.NET Core spans always root.
        // Depending on infrastructure used and how the application is exposed/called,
        // it might be a good idea to be in control of the root span (and therefore the size, baggage etch)
        // Taken from: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/issues/1773
        _ = Sdk.SuppressInstrumentation; // Just to trigger static constructor. The static constructor in Sdk initializes Propagators.DefaultTextMapPropagator which we depend on below
        Sdk.SetDefaultTextMapPropagator(new OtelPropagator(Propagators.DefaultTextMapPropagator));
        DistributedContextPropagator.Current = new AspNetCorePropagator();

        var appInsightsConnectionString = GetAppInsightsConnectionStringForOtel(config, env);

        services
            .AddOpenTelemetry()
            .ConfigureResource(r =>
                r.AddService(serviceName: appId, serviceVersion: appVersion, serviceInstanceId: Environment.MachineName)
            )
            .WithTracing(builder =>
            {
                builder = builder
                    .AddSource(appId)
                    .AddHttpClientInstrumentation(opts =>
                    {
                        opts.RecordException = true;
                    })
                    .AddAspNetCoreInstrumentation(opts =>
                    {
                        opts.RecordException = true;
                    });

                if (isTest)
                    return;

                if (!string.IsNullOrWhiteSpace(appInsightsConnectionString))
                {
                    builder = builder.AddAzureMonitorTraceExporter(options =>
                    {
                        options.ConnectionString = appInsightsConnectionString;
                    });
                }
                else
                {
                    builder = builder.AddOtlpExporter();
                }
            })
            .WithMetrics(builder =>
            {
                builder = builder
                    .AddMeter(appId)
                    .AddRuntimeInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddAspNetCoreInstrumentation();

                if (isTest)
                    return;

                if (!string.IsNullOrWhiteSpace(appInsightsConnectionString))
                {
                    builder = builder.AddAzureMonitorMetricExporter(options =>
                    {
                        options.ConnectionString = appInsightsConnectionString;
                    });
                }
                else
                {
                    builder = builder.AddOtlpExporter();
                }
            });

        services.AddLogging(logging =>
        {
            logging.AddOpenTelemetry(options =>
            {
                options.IncludeFormattedMessage = true;

                if (isTest)
                    return;

                if (!string.IsNullOrWhiteSpace(appInsightsConnectionString))
                {
                    options.AddAzureMonitorLogExporter(options =>
                    {
                        options.ConnectionString = appInsightsConnectionString;
                    });
                }
                else
                {
                    options.AddOtlpExporter();
                }
            });
        });
    }

    private sealed class TelemetryInitialization(
        ILogger<TelemetryInitialization> logger,
        Telemetry telemetry,
        MeterProvider meterProvider
    ) : IHostedService
    {
        public async Task StartAsync(CancellationToken cancellationToken)
        {
            // This codepath for initialization is here only because it makes it a lot easier to
            // query the metrics from Prometheus using 'increase' without the appearance of a "missed" sample.
            // 'increase' in Prometheus will not interpret 'none' -> 1 as a delta/increase,
            // so when querying the increase within a range, there may be 1 less sample than expected.
            // So here we let the metrics be initialized to 0,
            // and then run collection/flush on the OTel MeterProvider to make sure they are exported.
            // The first time we then increment the metric, it will count as a change from 0 -> 1
            telemetry.Init();
            try
            {
                var task = Task.Factory.StartNew(
                    () =>
                    {
                        if (!meterProvider.ForceFlush(10_000))
                        {
                            logger.LogInformation("Failed to flush metrics after 10 seconds");
                        }
                    },
                    cancellationToken,
                    // Long running to avoid doing this blocking on a "normal" thread pool thread
                    TaskCreationOptions.LongRunning | TaskCreationOptions.DenyChildAttach,
                    TaskScheduler.Default
                );
                if (await Task.WhenAny(task, Task.Delay(500, cancellationToken)) != task)
                {
                    logger.LogInformation(
                        "Tried to flush metrics within 0.5 seconds but it was taking too long, proceeding with startup"
                    );
                }
            }
            catch (Exception ex)
            {
                if (ex is OperationCanceledException)
                    return;
                logger.LogWarning(ex, "Failed to flush metrics");
            }
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    /// <summary>
    /// PDF generation works by using a headless browser to render the frontend of an app instance.
    /// To make  debugging PDF generation failures easier, we want requests originating from the PDF generator to be
    /// contained in the root trace (process/next) as children. The frontend will set this header when making requests to the app backend in PDF mode.
    /// </summary>
    /// <param name="headers">Request headers attached to the span</param>
    /// <returns></returns>
    private static bool IsPdfGeneratorRequest(IHeaderDictionary headers) => headers.ContainsKey("X-Altinn-IsPdf");

    internal sealed class OtelPropagator : TextMapPropagator
    {
        private readonly TextMapPropagator _inner;

        public OtelPropagator(TextMapPropagator inner) => _inner = inner;

        public override ISet<string>? Fields => _inner.Fields;

        public override PropagationContext Extract<T>(
            PropagationContext context,
            T carrier,
            Func<T, string, IEnumerable<string>?> getter
        )
        {
            if (carrier is HttpRequest req && !IsPdfGeneratorRequest(req.Headers))
                return default;

            return _inner.Extract(context, carrier, getter);
        }

        public override void Inject<T>(PropagationContext context, T carrier, Action<T, string, string> setter) =>
            _inner.Inject(context, carrier, setter);
    }

    internal sealed class AspNetCorePropagator : DistributedContextPropagator
    {
        private readonly DistributedContextPropagator _inner;

        public AspNetCorePropagator() => _inner = CreateDefaultPropagator();

        public override IReadOnlyCollection<string> Fields => _inner.Fields;

        public override IEnumerable<KeyValuePair<string, string?>>? ExtractBaggage(
            object? carrier,
            PropagatorGetterCallback? getter
        )
        {
            if (carrier is IHeaderDictionary headers && !IsPdfGeneratorRequest(headers))
                return null;

            return _inner.ExtractBaggage(carrier, getter);
        }

        public override void ExtractTraceIdAndState(
            object? carrier,
            PropagatorGetterCallback? getter,
            out string? traceId,
            out string? traceState
        )
        {
            if (carrier is IHeaderDictionary headers && !IsPdfGeneratorRequest(headers))
            {
                traceId = null;
                traceState = null;
                return;
            }

            _inner.ExtractTraceIdAndState(carrier, getter, out traceId, out traceState);
        }

        public override void Inject(Activity? activity, object? carrier, PropagatorSetterCallback? setter) =>
            _inner.Inject(activity, carrier, setter);
    }

    private static void AddAuthorizationPolicies(IServiceCollection services)
    {
        services
            .AddAuthorizationBuilder()
            .AddPolicy(
                AuthzConstants.POLICY_INSTANCE_READ,
                policy => policy.Requirements.Add(new AppAccessRequirement("read"))
            )
            .AddPolicy(
                AuthzConstants.POLICY_INSTANCE_WRITE,
                policy => policy.Requirements.Add(new AppAccessRequirement("write"))
            )
            .AddPolicy(
                AuthzConstants.POLICY_INSTANCE_DELETE,
                policy => policy.Requirements.Add(new AppAccessRequirement("delete"))
            )
            .AddPolicy(
                AuthzConstants.POLICY_INSTANCE_INSTANTIATE,
                policy => policy.Requirements.Add(new AppAccessRequirement("instantiate"))
            )
            .AddPolicy(
                AuthzConstants.POLICY_INSTANCE_COMPLETE,
                policy => policy.Requirements.Add(new AppAccessRequirement("complete"))
            );
    }

    private static void AddAuthenticationScheme(
        IServiceCollection services,
        IConfiguration config,
        IWebHostEnvironment env
    )
    {
        services
            .AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
            .AddJwtCookie(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    RequireExpirationTime = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                };
                options.JwtCookieName = Altinn.App.Core.Constants.General.RuntimeCookieName;
                options.MetadataAddress = config["AppSettings:OpenIdWellKnownEndpoint"];
                if (env.IsDevelopment())
                {
                    options.RequireHttpsMetadata = false;
                }
            });
    }

    private static void AddAntiforgery(IServiceCollection services)
    {
        services.AddAntiforgery(options =>
        {
            // asp .net core expects two types of tokens: One that is attached to the request as header, and the other one as cookie.
            // The values of the tokens are not the same and both need to be present and valid in a "unsafe" request.

            // Axios which we are using for client-side automatically extracts the value from the cookie named XSRF-TOKEN. We are setting this cookie in the UserController.
            // We will therefore have two token cookies. One that contains the .net core cookie token; And one that is the request token and is added as a header in requests.
            // The tokens are based on the logged-in user and must be updated if the user changes.
            // https://docs.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-3.1
            // https://github.com/axios/axios/blob/master/lib/defaults.js
            options.Cookie.Name = "AS-XSRF-TOKEN";
            options.HeaderName = "X-XSRF-TOKEN";
        });

        services.TryAddSingleton<ValidateAntiforgeryTokenIfAuthCookieAuthorizationFilter>();
    }

    private static (string? Key, string? ConnectionString) GetAppInsightsConfig(
        IConfiguration config,
        IHostEnvironment env
    )
    {
        var isDevelopment = env.IsDevelopment();
        string? key = isDevelopment
            ? config["ApplicationInsights:InstrumentationKey"]
            : Environment.GetEnvironmentVariable("ApplicationInsights__InstrumentationKey");
        string? connectionString = isDevelopment
            ? config["ApplicationInsights:ConnectionString"]
            : Environment.GetEnvironmentVariable("ApplicationInsights__ConnectionString");

        return (key, connectionString);
    }

    private static string? GetAppInsightsConnectionStringForOtel(IConfiguration config, IHostEnvironment env)
    {
        var (key, connString) = GetAppInsightsConfig(config, env);
        if (string.IsNullOrWhiteSpace(connString))
        {
            connString = Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");
        }
        if (!string.IsNullOrWhiteSpace(connString))
        {
            return connString;
        }

        if (!Guid.TryParse(key, out _))
        {
            return null;
        }

        return $"InstrumentationKey={key}";
    }
}
