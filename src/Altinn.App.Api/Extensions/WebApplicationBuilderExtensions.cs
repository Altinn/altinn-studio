#nullable enable
using System.Reflection;
using Altinn.App.Api.Configuration;
using Altinn.App.Api.Helpers;
using Prometheus;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Altinn specific extensions for <see cref="WebApplication"/>.
/// </summary>
public static class WebApplicationBuilderExtensions
{
    /// <summary>
    /// Add default Altinn configuration for an app.
    /// </summary>
    /// <param name="app">The <see cref="IApplicationBuilder"/>.</param>
    /// <returns></returns>
    public static IApplicationBuilder UseAltinnAppCommonConfiguration(this IApplicationBuilder app)
    {
        var appId = StartupHelper.GetApplicationId();
        if (app is WebApplication webApp && webApp.Environment.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
            webApp.UseAltinnPrometheus(appId);
        }
        
        app.UseHttpMetrics();
        app.UseMetricServer();
        app.UseDefaultSecurityHeaders();
        app.UseRouting();
        app.UseStaticFiles('/' + appId);
        app.UseAuthentication();
        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
        app.UseHealthChecks("/health");
        return app;
    }

    private static void UseAltinnPrometheus(this WebApplication webApp, string appId)
    {
        var metricsSettings = webApp.Configuration.GetSection("MetricsSettings")?.Get<MetricsSettings>() ?? new MetricsSettings();
        if (!metricsSettings.Enabled)
        {
            return;
        }

        webApp.UseHttpMetrics();
        var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown";
        Metrics.DefaultRegistry.SetStaticLabels(new Dictionary<string, string>()
        {
            { "application_id", appId },
            { "nuget_package_version", version }
        });
    }
}
