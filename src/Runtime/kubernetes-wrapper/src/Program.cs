using System.Reflection;
using Altinn.Studio.KubernetesWrapper.Configuration;
using Altinn.Studio.KubernetesWrapper.Hosting;
using Altinn.Studio.KubernetesWrapper.Services.Implementation;
using Altinn.Studio.KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

RegisterServices(builder.Services, builder.Configuration);
builder.AddOpenTelemetry();

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

    app.Use(
        static (context, next) =>
        {
            EnrichHttpRequestMetrics(context);
            return next();
        }
    );

    app.UseCors();
    app.MapControllers();
}

static void RegisterServices(IServiceCollection services, IConfiguration configuration)
{
    services
        .AddOptions<GeneralSettings>()
        .Bind(configuration.GetSection(GeneralSettings.SectionName))
        .Validate(
            options => options.CacheTtlSeconds > 0,
            $"{GeneralSettings.SectionName}:CacheTtlSeconds must be greater than zero."
        )
        .Validate(
            options =>
                options.KubernetesRequestTimeoutSeconds
                    is > 0
                        and <= GeneralSettings.MaxKubernetesRequestTimeoutSeconds,
            $"{GeneralSettings.SectionName}:KubernetesRequestTimeoutSeconds must be between 1 and {GeneralSettings.MaxKubernetesRequestTimeoutSeconds}."
        )
        .ValidateOnStart();

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

static void EnrichHttpRequestMetrics(HttpContext context)
{
    if (!context.Request.Path.StartsWithSegments("/api/v1", StringComparison.OrdinalIgnoreCase))
    {
        return;
    }

    IHttpMetricsTagsFeature? tagsFeature = context.Features.Get<IHttpMetricsTagsFeature>();
    if (tagsFeature is null)
    {
        return;
    }

    bool hasLabelSelector = !string.IsNullOrWhiteSpace(context.Request.Query["labelSelector"]);
    bool hasFieldSelector = !string.IsNullOrWhiteSpace(context.Request.Query["fieldSelector"]);

    string selectorMode = (hasLabelSelector, hasFieldSelector) switch
    {
        (false, false) => "none",
        (true, false) => "label",
        (false, true) => "field",
        _ => "both",
    };

    tagsFeature.Tags.Add(new("kubernetes_wrapper.selector_mode", selectorMode));
}
