using Altinn.App.PlatformServices.Extensions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace Altinn.App
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
             .ConfigureWebHostDefaults(webBuilder =>
             {
                 webBuilder.ConfigureAppConfiguration((hostingContext, configBuilder) =>
                 {
                     configBuilder.LoadAppConfig();
                 });
                 webBuilder.UseStartup<Startup>();
             });
    }
}
