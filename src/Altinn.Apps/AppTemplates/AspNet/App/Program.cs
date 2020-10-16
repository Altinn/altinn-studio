using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
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
                     LoadKeyVaultConfig(configBuilder);
                     configBuilder.AddEnvironmentVariables();
                     configBuilder.AddJsonFile(Directory.GetCurrentDirectory() + @"/appsettings.json", true, true);
                 });
                 webBuilder.UseStartup<Startup>();
             });

        public static void LoadKeyVaultConfig(IConfigurationBuilder configBuilder)
        {
            string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;

            if (basePath == "/")
            {
                // On a pod/container where the app is located in an app folder on the root of the filesystem.
                configBuilder.SetBasePath(basePath);
                configBuilder.AddJsonFile(basePath + @"altinn-appsettings-secret/altinn-appsettings-secret.json", true, true);
            }
        }
    }
}
