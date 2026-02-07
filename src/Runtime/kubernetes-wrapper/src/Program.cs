using System.Reflection;
using Altinn.Studio.KubernetesWrapper.Services.Implementation;
using Altinn.Studio.KubernetesWrapper.Services.Interfaces;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

RegisterServices(builder.Services);

var app = builder.Build();

ConfigureApp(app);

await app.RunAsync();

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

    services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "Altinn Kuberneteswrapper", Version = "v1" });
        IncludeXmlComments(c);
    });
}

static void IncludeXmlComments(SwaggerGenOptions swaggerGenOptions)
{
    var assembly = Assembly.GetEntryAssembly();
    if (assembly is null)
    {
        return;
    }

    string xmlFile = $"{assembly.GetName().Name}.xml";
    string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        swaggerGenOptions.IncludeXmlComments(xmlPath);
    }
}
