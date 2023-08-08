using System.Reflection;
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
        if (app is WebApplication webApp && webApp.Environment.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }
        
        app.UseHttpMetrics();
        app.UseMetricServer();
        var appId = StartupHelper.GetApplicationId();
        var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString();
        Metrics.DefaultRegistry.SetStaticLabels(new Dictionary<string, string>()
        {
            { "application_id", appId },
            { "nuget_package_version", version }
        });
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
}