using Altinn.App.Core.Extensions;
using Microsoft.AspNetCore.Hosting;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Class for defining extensions to IWebHostBuilder for AltinnApps
/// </summary>
public static class WebHostBuilderExtensions
{
    /// <summary>
    /// Configure webhost with default values for Altinn Apps
    /// </summary>
    /// <param name="builder">The <see cref="IWebHostBuilder"/> being configured</param>
    /// <param name="args">Application arguments</param>
    public static void ConfigureAppWebHost(this IWebHostBuilder builder, string[] args)
    {
        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.LoadAppConfig(args);
        });
    }
}
