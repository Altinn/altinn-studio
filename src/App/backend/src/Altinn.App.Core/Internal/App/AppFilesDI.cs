using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Core.Internal.App;

internal static class AppFilesDI
{
    /// <summary>
    /// Loads the app files from the content root of the host, failing for a broken app, and registers them in an
    /// <see cref="AppFilesAccessor"/>. It also registers <see cref="AppFilesHostedService"/>, which logs the
    /// diagnostics of the files at startup and, in Development, picks up edits without a restart.
    /// </summary>
    /// <exception cref="ApplicationConfigException">When the app files cannot be loaded.</exception>
    /// <exception cref="InvalidOperationException">When the app files have already been added.</exception>
    public static void AddAppFiles(this IServiceCollection services, IHostEnvironment env)
    {
        // Registering twice would load the files into an accessor nobody resolves, log its diagnostics twice and, in
        // Development, poll into it
        if (services.Any(d => d.ServiceType == typeof(AppFilesAccessor)))
        {
            throw new InvalidOperationException(
                "The Altinn app services have already been added. Call AddAltinnAppServices once in Program.cs."
            );
        }

        // Loaded here, so a broken app fails in AddAltinnAppServices rather than on the first request
        var accessor = new AppFilesAccessor(AppFilesLoader.Load(env.ContentRootPath));
        services.AddSingleton(accessor);
        services.AddHostedService<AppFilesHostedService>();
    }
}
