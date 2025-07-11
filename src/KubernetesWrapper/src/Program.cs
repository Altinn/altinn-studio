using System.Reflection;
using Azure.Identity;
using Azure.Monitor.Query;
using KubernetesWrapper.Configuration;
using KubernetesWrapper.Services.Implementation;
using KubernetesWrapper.Services.Interfaces;

using Microsoft.OpenApi.Models;

using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<GeneralSettings>(builder.Configuration.GetSection("GeneralSettings"));
builder.Services.AddSingleton(new LogsQueryClient(new DefaultAzureCredential()));

RegisterServices(builder.Services);

var app = builder.Build();

ConfigureApp(app);

app.Run();

static void ConfigureApp(WebApplication app)
{
    if (!app.Environment.IsDevelopment())
    {
        app.UseHsts();
        app.UseExceptionHandler("/error");
    }
    else
    {
        app.UseExceptionHandler("/error-development");
    }

    app.UseSwagger(o => o.RouteTemplate = "kuberneteswrapper/swagger/{documentName}/swagger.json");

    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/kuberneteswrapper/swagger/v1/swagger.json", "Altinn Platform kuberneteswrapper API");
        c.RoutePrefix = "kuberneteswrapper/swagger";
    });

    // app.UseRouting();
    app.UseCors();
    app.MapControllers();
}

static void RegisterServices(IServiceCollection services)
{
    services.AddCors(options =>
    {
        options.AddDefaultPolicy(builder =>
        {
            builder.AllowAnyOrigin();
            builder.WithMethods("GET");
            builder.AllowAnyHeader();
        });
    });
    services.AddControllers();
    services.AddSingleton<IKubernetesApiWrapper, KubernetesApiWrapper>();
    services.AddTransient<IAppExceptionsService, AppExceptionsService>();
    services.AddTransient<IAppFailedRequestsService, AppFailedRequestsService>();
    services.AddTransient<IContainerLogsService, ContainerLogsService>();

    services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Kuberneteswrapper", Version = "v1" });
        IncludeXmlComments(c);
    });
}

static void IncludeXmlComments(SwaggerGenOptions swaggerGenOptions)
{
    try
    {
        string xmlFile = $"{Assembly.GetEntryAssembly().GetName().Name}.xml";
        string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        swaggerGenOptions.IncludeXmlComments(xmlPath);
    }
    catch
    {
        // not critical for the application
    }
}
