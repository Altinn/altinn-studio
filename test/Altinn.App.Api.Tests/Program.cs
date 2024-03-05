using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Api.Tests.Mocks.Authentication;
using Altinn.App.Api.Tests.Mocks.Event;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using AltinnCore.Authentication.JwtCookie;
using App.IntegrationTests.Mocks.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;

// This file should be as close to the Program.cs file in the app template
// as possible to ensure we test the configuration of the dependency injection
// container in this project.
// External interfaces like Platform related services, Authenication, Authorization
// external api's etc. should be mocked.

WebApplicationBuilder builder = WebApplication.CreateBuilder(
    new WebApplicationOptions()
    {
        ApplicationName = "Altinn.App.Api.Tests",
        WebRootPath = Path.Join(TestData.GetTestDataRootDirectory(), "apps", "tdd", "contributer-restriction")
    });

builder.Configuration.AddJsonFile(Path.Join(TestData.GetTestDataRootDirectory(), "apps", "tdd", "contributer-restriction", "appsettings.json"));
builder.Configuration.GetSection("MetricsSettings:Enabled").Value = "false";

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
    PlatformSettings platformSettings = new PlatformSettings() { ApiAuthorizationEndpoint = "http://localhost:5101/authorization/api/v1/" };
    services.AddSingleton<IOptions<PlatformSettings>>(Options.Create(platformSettings));
    services.AddTransient<IAuthorizationClient, AuthorizationMock>();
    services.AddTransient<IInstanceClient, InstanceClientMockSi>();
    services.AddSingleton<Altinn.Common.PEP.Interfaces.IPDP, PepWithPDPAuthorizationMockSI>();
    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>();
    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
    services.AddTransient<IEventHandlerResolver, EventHandlerResolver>();
    services.AddSingleton<IEventSecretCodeProvider, EventSecretCodeProviderStub>();
    services.AddTransient<IEventHandler, DummyFailureEventHandler>();
    services.AddTransient<IEventHandler, DummySuccessEventHandler>();
    services.AddTransient<IAppMetadata, AppMetadataMock>();
    services.AddTransient<IDataClient, DataClientMock>();
    services.AddTransient<IAltinnPartyClient, AltinnPartyClientMock>();
    services.AddTransient<IProfileClient, ProfileClientMock>();
    services.AddTransient<IInstanceEventClient, InstanceEventClientMock>();
    services.AddTransient<IAppModel, AppModelMock>();
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

// This "hack" (documentet by Microsoft) is done to
// make the Program class public and available for
// integration tests.
public partial class Program { }
