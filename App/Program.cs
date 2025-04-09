using Altinn.App.Actions;
using Altinn.App.Api.Extensions;
using Altinn.App.Api.Helpers;
using Altinn.App.Core.Features;
using Altinn.App.logic.DataProcessing;
using Altinn.App.logic.Pdf;
using Altinn.App.logic.Validation;
using Altinn.App.Options;
using Altinn.App.services.options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Logic.Instantiation;
using Altinn.App.logic.MetaData;
using Altinn.FileAnalyzers.MimeType;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using Altinn.Codelists.Extensions;

void RegisterCustomAppServices(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
{
    // Register your apps custom service implementations here.
    services.AddTransient<IAppOptionsProvider, ReferenceOptions>();
    services.AddTransient<IAppOptionsProvider, AnimalColorsOptions>();
    services.AddTransient<IAppOptionsProvider, BalloonColorsOptions>();
    services.AddTransient<IInstanceAppOptionsProvider, TestOptionsProvider>();
    services.AddTransient<IDataProcessor, DataProcessor>();
    services.AddTransient<IInstantiationProcessor, InstantiationProcessor>();
    services.AddTransient<IInstantiationValidator, InstantiationValidator>();
    services.AddTransient<IFormDataValidator, ChangeNameValidator>();
    services.AddTransient<IFormDataValidator, GroupValidator>();
    services.AddTransient<IPdfFormatter, PdfFormatter>();
    services.AddTransient<IDataListProvider, ListCases>();
    services.AddTransient<IAppMetadata, CustomMetaData>();
    services.AddTransient<IUserAction, FillAction>();
    services.AddTransient<IUserAction, ConflictingOptionsReset>();
    services.AddTransient<IUserAction, ShiftingOptionsAdd>();
    services.AddTransient<IUserAction, ShiftingOptionsRemoveAll>();
    services.AddTransient<IUserAction, SortPetsAction>();
    services.AddTransient<IUserAction, GeneratePetsAction>();
    services.AddMimeTypeValidation();
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

    // Add support for retrieving shared codelists
    services.AddAltinnCodelists();

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
}
