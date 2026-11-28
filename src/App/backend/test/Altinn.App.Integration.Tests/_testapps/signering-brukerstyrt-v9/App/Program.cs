using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers;
using Altinn.App.Core.Features.Signing;
using Altinn.App.logic;
using Microsoft.OpenApi;

void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
{
    // ###########################################################################
    // Custom code to make integration test harness work (fully qualified, so the harness's types can't clash
    // with the app's):
    TestApp.Shared.FixtureConfigurationService.Instance.Configure(services, config, env);
    // ###########################################################################

    // Register your apps custom service implementations here.
    services.AddTransient<ISigneeProvider, FounderSigneesProvider>();
    services.AddTransient<ISigneeProvider, AuditorSigneesProvider>();
    services.AddTransient<IProcessExclusiveGateway, HasAuditorProcessGateway>();
}

// ###########################################################################
// Custom code to make integration test harness work:
TestApp.Shared.FixtureConfigurationService.Instance.Initialize();

// ###########################################################################

// ###########################################################################
// # Unless you are sure what you are doing do not change the following code #
// ###########################################################################

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

ConfigureServices(builder.Services, builder.Configuration);

ConfigureWebHostBuilder(builder.WebHost);

if (!builder.Environment.IsDevelopment())
{
    builder.AddAzureKeyVaultAsConfigProvider();
}

// ###########################################################################
// Not part of app-template
TestApp.Shared.TestingApis.CaptureServiceCollection(builder.Services);

// ###########################################################################

WebApplication app = builder.Build();

Configure();

app.Run();

void ConfigureServices(IServiceCollection services, IConfiguration config)
{
    services.AddAltinnAppControllersWithViews();

    // Register custom implementations for this application
    RegisterCustomAppServices(services, config, builder.Environment);

    // Register services required to run this as an Altinn application
    services.AddAltinnAppServices(config, builder.Environment);

    // Add Swagger support (Swashbuckle)
    services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn App Api", Version = "v1" });
        StartupHelper.IncludeXmlComments(c.IncludeXmlComments);
    });
}

void ConfigureWebHostBuilder(IWebHostBuilder builder)
{
    builder.ConfigureAppWebHost(args);
}

void Configure()
{
    string applicationId = StartupHelper.GetApplicationId();
    if (!string.IsNullOrEmpty(applicationId))
    {
        app.UseSwagger(o => o.RouteTemplate = applicationId + "/swagger/{documentName}/swagger.json");

        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint($"/{applicationId}/swagger/v1/swagger.json", "Altinn App API");
            c.RoutePrefix = applicationId + "/swagger";
        });
    }
    app.UseAltinnAppCommonConfiguration();

    // #########################################################################
    // Custom middleware not included in app template

    TestApp.Shared.TestingApis.UseTestingApis(app);

    // Configure scenario-specific endpoints
    var endpointConfigurators = app.Services.GetServices<TestApp.Shared.IEndpointConfigurator>();
    foreach (var configurator in endpointConfigurators)
        configurator.ConfigureEndpoints(app);
    // #########################################################################
}
