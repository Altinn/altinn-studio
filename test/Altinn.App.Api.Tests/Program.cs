using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers;
using Altinn.App.Api.Tests;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Api.Tests.Mocks.Authentication;
using Altinn.App.Api.Tests.Mocks.Event;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Cache;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Tests.Common.Mocks;
using AltinnCore.Authentication.JwtCookie;
using App.IntegrationTests.Mocks.Services;
using Microsoft.ApplicationInsights.AspNetCore.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;

// This file should be as close to the Program.cs file in the app template
// as possible to ensure we test the configuration of the dependency injection
// container in this project.
// External interfaces like Platform related services, Authentication, Authorization
// external api's etc. should be mocked.

WebApplicationBuilder builder = WebApplication.CreateBuilder(
    new WebApplicationOptions()
    {
        ApplicationName = "Altinn.App.Api.Tests",
        WebRootPath = Path.Join(TestData.GetTestDataRootDirectory(), "apps", "tdd", "contributer-restriction"),
        EnvironmentName = "Production",
    }
);
builder.WebHost.UseDefaultServiceProvider(
    (context, options) =>
    {
        options.ValidateScopes = true; // Allways validate scopes in test
        options.ValidateOnBuild = true;
    }
);

ApiTestBase.ConfigureFakeLogging(builder.Logging);

builder.Services.AddSingleton<TestId>(_ => new TestId(Guid.NewGuid()));
builder.Services.AddSingleton<IStartupFilter, ApiTestBase.ApiTestBaseStartupFilter>();

builder.Configuration.AddJsonFile(
    Path.Join(TestData.GetTestDataRootDirectory(), "apps", "tdd", "contributer-restriction", "appsettings.json")
);
builder.Configuration.GetSection("MetricsSettings:Enabled").Value = "false";
builder.Configuration.GetSection("AppSettings:UseOpenTelemetry").Value = "true";
builder.Services.Configure<ApplicationInsightsServiceOptions>(options =>
    options.RequestCollectionOptions.InjectResponseHeaders = false
);
builder.Services.Configure<GeneralSettings>(settings => settings.DisableLocaltestValidation = true);
builder.Services.Configure<GeneralSettings>(settings => settings.DisableAppConfigurationCache = true);
builder.Services.Configure<GeneralSettings>(settings => settings.IsTest = true);
builder.Configuration.GetSection("GeneralSettings:IsTest").Value = "true";

// AppConfigurationCache.Disable = true;

ConfigureServices(builder.Services, builder.Configuration);
ConfigureMockServices(builder.Services, builder.Configuration);

WebApplication app = builder.Build();
Configure();
app.Run();

void ConfigureServices(IServiceCollection services, IConfiguration config)
{
    services.AddAltinnAppControllersWithViews();
    services.AddAltinnAppServices(config, builder.Environment);
    // Add Swagger support (Swashbuckle)
    services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn App Api", Version = "v1" });
        StartupHelper.IncludeXmlComments(c.IncludeXmlComments);
    });
}

void ConfigureMockServices(IServiceCollection services, ConfigurationManager configuration)
{
    PlatformSettings platformSettings = new PlatformSettings()
    {
        ApiAuthorizationEndpoint = "http://localhost:5101/authorization/api/v1/",
    };
    services.AddSingleton<IOptions<PlatformSettings>>(Options.Create(platformSettings));
    services.AddTransient<IAuthorizationClient, AuthorizationMock>();
    services.AddTransient<IInstanceClient, InstanceClientMockSi>();
    services.AddSingleton<Altinn.Common.PEP.Interfaces.IPDP, PepWithPDPAuthorizationMockSI>();
    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
    services.AddTransient<IEventHandlerResolver, EventHandlerResolver>();
    services.AddSingleton<IEventSecretCodeProvider, EventSecretCodeProviderStub>();
    services.AddTransient<IEventHandler, DummyFailureEventHandler>();
    services.AddTransient<IEventHandler, DummySuccessEventHandler>();
    services.AddTransient<IAppMetadata, AppMetadataMock>();
    services.AddSingleton<IAppConfigurationCache, AppConfigurationCacheMock>();
    services.AddTransient<IDataClient, DataClientMock>();
    services.AddTransient<IAltinnPartyClient, AltinnPartyClientMock>();
    services.AddTransient<IRegisterClient, RegisterClientMock>();
    services.AddTransient<IProfileClient, ProfileClientMock>();
    services.AddTransient<IInstanceEventClient, InstanceEventClientMock>();
    services.AddTransient<IAppModel, AppModelMock<Program>>();
    services.AddTransient<IEventsClient, EventsClientMock>();
    services.AddTransient<ISignClient, SignClientMock>();

    services.PostConfigureAll<JwtCookieOptions>(options =>
    {
        // During tests we generate tokens immediately before trying to validate them.
        // Depending on the clock implementation used from the current OS, the clock may not be
        // monotonically increasing, so there is a non-zero chance we experience issues with 'nbf' for example
        // So since this is only relevant during tests we just amp up the clock skew to be safe
        options.TokenValidationParameters.ClockSkew = TimeSpan.FromSeconds(10);

        // Failed token validation during tests should output logs
        options.Events = new JwtCookieEvents
        {
            OnAuthenticationFailed = (context) =>
            {
                var services = context.HttpContext.RequestServices;
                var logger = services.GetRequiredService<ILogger<JwtCookieOptions>>();
                logger.LogError(context.Exception, "Authentication failed");
                return Task.CompletedTask;
            },
            OnTokenValidated = (context) =>
            {
                return Task.CompletedTask;
            },
        };
    });
}

void Configure()
{
    app.UseSwagger(o => o.RouteTemplate = "/swagger/{documentName}/swagger.{json|yaml}");

    // Enable middleware to serve generated Swagger as a JSON endpoint.
    // This is used for testing, and don't use the appId prefix used in real apps
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint($"/swagger/v1/swagger.json", "Altinn App API");
        c.RoutePrefix = "/swagger";
    });
    app.UseAltinnAppCommonConfiguration();
}

// This "hack" (documented by Microsoft) is done to
// make the Program class public and available for
// integration tests.
public partial class Program { }
