using Altinn.App.Actions;
using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.logic;
using Altinn.App.logic.DataProcessing;
using Altinn.App.logic.MetaData;
using Altinn.App.Options;
using Microsoft.OpenApi;

void RegisterCustomAppServices(
    IServiceCollection services,
    IConfiguration config,
    IWebHostEnvironment env
)
{
    // Register your apps custom service implementations here.
    services.AddTransient<IAppOptionsProvider, IndustryOptionsProvider>();
    services.AddTransient<IDataProcessor, DataProcessor>();
    services.AddTransient<IInstantiationProcessor, InstantiationProcessor>();
    services.AddTransient<IUserAction, RandomAction>();
    services.AddTransient<IDataListProvider, PersonListProvider>();
    services.AddTransient<IOnTaskEndingHandler, PrefillSharedPerson>();
}

// ###########################################################################
// # Unless you are sure what you are doing do not change the following code #
// ###########################################################################

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

ConfigureServices(builder.Services, builder.Configuration);

ConfigureWebHostBuilder(builder.WebHost);

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

    // Wrap the built-in IAppMetadata registered above, so that PDF creation can be switched off per request.
    // The built-in implementation is internal, so it is created from its registration rather than constructed.
    ServiceDescriptor builtInAppMetadata = services.Single(d => d.ServiceType == typeof(IAppMetadata));
    services.Remove(builtInAppMetadata);
    services.AddSingleton<IAppMetadata>(sp => new CustomMetaData(
        (IAppMetadata)ActivatorUtilities.CreateInstance(sp, builtInAppMetadata.ImplementationType!),
        sp.GetRequiredService<IHttpContextAccessor>()
    ));

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
