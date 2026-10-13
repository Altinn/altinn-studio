using Microsoft.ApplicationInsights.AspNetCore.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Tests.Common;

public static class AppBuilder
{
    public static WebApplication Build(
        WebApplicationBuilder? builder = default,
        IEnumerable<KeyValuePair<string, string?>>? configData = default,
        Action<IServiceCollection>? registerCustomAppServices = default,
        Action<IServiceCollection>? overrideAltinnAppServices = default
    )
    {
        // Follow the generated app startup order, with an additional test-only override callback
        // after AddAltinnAppServices. The v8 app template has no corresponding override hook.

        // 0. WebApplication.CreateBuilder()
        builder ??= WebApplication.CreateBuilder();
        builder.Environment.EnvironmentName = "Development";

        builder.Configuration.AddInMemoryCollection([new("GeneralSettings:IsTest", "true")]);
        if (configData is not null)
        {
            builder.Configuration.AddInMemoryCollection(configData);
        }

        // 1. AddAltinnAppControllersWithViews
        Api.Extensions.ServiceCollectionExtensions.AddAltinnAppControllersWithViews(builder.Services);

        // 2. RegisterCustomAppServices
        registerCustomAppServices?.Invoke(builder.Services);

        // 3. AddAltinnAppServices
        Api.Extensions.ServiceCollectionExtensions.AddAltinnAppServices(
            builder.Services,
            builder.Configuration,
            builder.Environment
        );
        builder.Services.Configure<ApplicationInsightsServiceOptions>(options =>
            options.RequestCollectionOptions.InjectResponseHeaders = false
        );

        // 4. Test-only callback for registrations after Altinn services
        overrideAltinnAppServices?.Invoke(builder.Services);

        // 5. ConfigureAppWebHost
        Api.Extensions.WebHostBuilderExtensions.ConfigureAppWebHost(builder.WebHost, []);

        // 6. UseAltinnAppCommonConfiguration
        var app = builder.Build();
        Api.Extensions.WebApplicationBuilderExtensions.UseAltinnAppCommonConfiguration(app);

        return app;
    }
}
