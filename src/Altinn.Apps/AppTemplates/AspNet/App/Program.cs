using System;
using Altinn.App.PlatformServices.Extensions;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace Altinn.App
{
    /// <summary>
    /// This class holds the entry point of the ASP.Net Core application.
    /// </summary>
    public class Program
    {
        /// <summary>
        /// The entry point of the application. Called when the application is started.
        /// </summary>
        /// <param name="args">The command line arguments used when starting the application.</param>
        public static void Main(string[] args)
        {
            TelemetryConfiguration telemetryConfiguration = TelemetryConfiguration.CreateDefault();
            telemetryConfiguration.InstrumentationKey =
                    System.Environment.GetEnvironmentVariable("ApplicationInsights__InstrumentationKey") ?? string.Empty;

            TelemetryClient telemetryClient = new TelemetryClient(telemetryConfiguration);

            try
            {
                CreateHostBuilder(args).Build().Run();
            }
            catch (Exception ex)
            {
                telemetryClient.TrackException(ex);

                telemetryClient.Flush();

                throw;
            }
        }

        /// <summary>
        /// Create the actual web application host. Kestrel and or IIS.
        /// </summary>
        /// <param name="args">The command line arguments when starting the application.</param>
        /// <returns>A new HostBuilder initialized through configuration and <see cref="Startup"/>.</returns>
        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.ConfigureAppConfiguration((hostingContext, configBuilder) =>
                    {
                        configBuilder.LoadAppConfig(args);
                    });
                    webBuilder.UseStartup<Startup>();
                });
    }
}
