using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Extensions.Logging;

namespace Altinn.Platform.Receipt
{
    /// <summary>
    /// This is the main method for running this asp.net core application
    /// </summary>
    public static class Program
    {
        /// <summary>
        /// The main method
        /// </summary>
        /// <param name="args">The Arguments</param>
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        /// <summary>
        /// Configure the configuration builder
        /// </summary>
        /// <param name="args">arguments for creating build configuration</param>
        /// <returns>The web host builder</returns>
        public static IHostBuilder CreateHostBuilder(string[] args) =>
               Host.CreateDefaultBuilder(args)
               .ConfigureLogging((hostingContext, logging) =>
               {
                   logging.ClearProviders();
                   Serilog.ILogger logger = new LoggerConfiguration()
                                   .WriteTo.Console()
                                   .CreateLogger();
                   logging.AddProvider(new SerilogLoggerProvider(logger));
               })
          .ConfigureWebHostDefaults(webBuilder =>
          {
              webBuilder.UseStartup<Startup>();
          });
    }
}
