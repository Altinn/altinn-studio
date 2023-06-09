using Altinn.App.Api.Extensions;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Api.Tests.Mocks.Authentication;
using Altinn.App.Api.Tests.Mocks.Event;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

// This file should be as close to the Program.cs file in the app template
// as possible to ensure we test the configuration of the dependency injection
// container in this project.
// External interfaces like Platform related services, Authenication, Authorization
// external api's etc. should be mocked.

WebApplicationBuilder builder = WebApplication.CreateBuilder(new WebApplicationOptions() { ApplicationName = "Altinn.App.Api.Tests" });
ConfigureServices(builder.Services, builder.Configuration);
ConfigureMockServices(builder.Services, builder.Configuration);

WebApplication app = builder.Build();
Configure();
app.Run();

void ConfigureServices(IServiceCollection services, IConfiguration config)
{
    services.AddAltinnAppControllersWithViews();
    services.AddAltinnAppServices(config, builder.Environment);
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
}

void Configure()
{
    if (app.Environment.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }

    app.UseDefaultSecurityHeaders();
    app.UseRouting();
    app.UseStaticFiles();
    app.UseAuthentication();
    app.UseAuthorization();

    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
    });
    app.UseHealthChecks("/health");
}

// This "hack" (documentet by Microsoft) is done to
// make the Program class public and available for
// integration tests.
public partial class Program {}
