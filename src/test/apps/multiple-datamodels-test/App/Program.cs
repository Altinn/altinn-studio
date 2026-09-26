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

    // The library's IAppMetadata implementation is internal and registered with TryAdd, so the wrapper
    // that turns off PDF generation is layered on top of it after the library services are registered.
    DecorateAppMetadata(services);

    // Add Swagger support (Swashbuckle)
    services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn App Api", Version = "v1" });
        StartupHelper.IncludeXmlComments(c.IncludeXmlComments);
    });
}

void DecorateAppMetadata(IServiceCollection services)
{
    ServiceDescriptor libraryAppMetadata = services.Single(descriptor => descriptor.ServiceType == typeof(IAppMetadata));
    Type libraryImplementation =
        libraryAppMetadata.ImplementationType
        ?? throw new InvalidOperationException("Expected the library to register IAppMetadata by implementation type.");

    services.Remove(libraryAppMetadata);
    services.Add(ServiceDescriptor.Describe(libraryImplementation, libraryImplementation, libraryAppMetadata.Lifetime));
    services.Add(
        ServiceDescriptor.Describe(
            typeof(IAppMetadata),
            serviceProvider => new CustomMetaData(
                (IAppMetadata)serviceProvider.GetRequiredService(libraryImplementation),
                serviceProvider.GetRequiredService<IHttpContextAccessor>()
            ),
            libraryAppMetadata.Lifetime
        )
    );
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
