using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.App;

internal static class AppFilesDI
{
    /// <summary>
    /// Loads the app files from the content root of the host, failing for a broken app, and registers them in an
    /// <see cref="AppFilesAccessor"/>. In Development it also registers <see cref="AppFilesPoller"/>, which picks up
    /// edits without a restart.
    /// </summary>
    /// <exception cref="ApplicationConfigException">When the app files cannot be loaded.</exception>
    /// <exception cref="InvalidOperationException">When the app files have already been added.</exception>
    public static void AddAppFiles(this IServiceCollection services, IHostEnvironment env)
    {
        // Registering twice would load the files into an accessor nobody resolves and, in Development, poll into it
        if (services.Any(d => d.ServiceType == typeof(AppFilesAccessor)))
        {
            throw new InvalidOperationException(
                "The Altinn app services have already been added. Call AddAltinnAppServices once in Program.cs."
            );
        }

        string basePath = env.ContentRootPath;

        // Loaded here, so a broken app fails in AddAltinnAppServices rather than on the first request
        var accessor = new AppFilesAccessor(AppFilesLoader.Load(basePath));
        services.AddSingleton(accessor);
        if (env.IsDevelopment())
        {
            services.AddSingleton<IHostedService>(sp => new AppFilesPoller(
                accessor,
                basePath,
                sp.GetRequiredService<ILogger<AppFilesPoller>>()
            ));
        }
    }
}
