using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace Altinn.Common.PEP
{
    /// <summary>
    /// The main entry point for the PEP, library?
    /// </summary>
    public class Program
    {
        /// <summary>
        /// The main entry point for the PEP, library?
        /// </summary>
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        /// <summary>
        /// Configure logging for setting up application. Temporary
        /// </summary>
        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
