using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.App;

internal static class AppFilesDI
{
    /// <summary>
    /// Registers the <see cref="AppFilesAccessor"/> and loads the app files from the content root of the host into it,
    /// failing for a broken app. In Development it also registers <see cref="AppFilesPoller"/>, which picks up edits
    /// without a restart.
    /// </summary>
    /// <exception cref="ApplicationConfigException">When the app files cannot be loaded.</exception>
    /// <exception cref="InvalidOperationException">When the app files have already been added.</exception>
    public static async Task AddAppFiles(this IServiceCollection services, IHostEnvironment env)
    {
        ThrowIfAdded(services);
        string basePath = env.ContentRootPath;

        // Everything is registered before the first await. A Program.cs that forgets to await then builds a container
        // that has the accessor, which explains the missing await from AppFiles.Empty until the files are in, and in
        // Development has the poller, which loads them on its first poll.
        var accessor = new AppFilesAccessor();
        services.AddSingleton(accessor);
        if (env.IsDevelopment())
        {
            services.AddSingleton<IHostedService>(sp => new AppFilesPoller(
                accessor,
                basePath,
                sp.GetRequiredService<ILogger<AppFilesPoller>>()
            ));
        }

        accessor.Update(await AppFilesLoader.Load(basePath, CancellationToken.None));
    }

    /// <summary>
    /// Guards against registering the Altinn app services twice, which would load the files into an accessor nobody
    /// resolves and, in Development, poll into it.
    /// </summary>
    /// <exception cref="InvalidOperationException">When the app files have already been added.</exception>
    public static void ThrowIfAdded(IServiceCollection services)
    {
        if (services.Any(d => d.ServiceType == typeof(AppFilesAccessor)))
        {
            throw new InvalidOperationException(
                "The Altinn app services have already been added. Call AddAltinnAppServices once in Program.cs."
            );
        }
    }
}
