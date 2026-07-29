using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers;
using Altinn.App.Core.Features.Process;
using Altinn.App.Logic;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi;

void RegisterCustomAppServices(
    IServiceCollection services,
    IConfiguration config,
    IWebHostEnvironment env
)
{
    // Pre-commit lever: fails/delays the forward Task_1 transition while committed=Task_1.
    services.AddTransient<IOnTaskEndingHandler, TaskEndingHandler>();

    // Post-commit lever: the "scenario" service task (Task_Service / Task_ServiceLayout) the
    // Gateway_PostCommit gateway routes through when path == "postCommit". ExecuteServiceTask runs
    // it as a critical post-commit step, so its delays/failures are frontend-observable
    // (committed = the service task).
    services.AddTransient<IServiceTask, ScenarioServiceTask>();

    // Background driver for the parkThenRelease lever: releases a parked service task after a few
    // seconds via an ordinary authorized process/next, imitating an external callback.
    services.AddSingleton<ParkedTaskReleaser>();
    services.AddHttpClient();
}

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
        app.UseSwagger(o =>
            o.RouteTemplate = applicationId + "/swagger/{documentName}/swagger.json"
        );

        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint($"/{applicationId}/swagger/v1/swagger.json", "Altinn App API");
            c.RoutePrefix = applicationId + "/swagger";
        });
    }
    app.UseAltinnAppCommonConfiguration();
}
