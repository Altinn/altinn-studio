using Altinn.App.Api.Helpers;
using Altinn.App.Api.Infrastructure.Middleware;

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
        }

        app.UseDefaultSecurityHeaders();
        app.UseRouting();
        app.UseStaticFiles('/' + appId);
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseTelemetryEnricher();
        app.UseScopeAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
        app.UseHealthChecks("/health");
        return app;
    }
}
