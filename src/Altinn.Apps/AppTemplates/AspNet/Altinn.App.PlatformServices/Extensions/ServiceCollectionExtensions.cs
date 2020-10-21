using Altinn.App.PlatformServices.Implementation;
using Altinn.App.Services.Interface;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.PlatformServices.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static void AddAppSecrets(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
        {
            if (!env.IsDevelopment())
            {
                services.AddSingleton<ISecrets, SecretsAppSI>();
                services.Configure<KeyVaultSettings>(configuration.GetSection("kvSetting"));
            }
            else
            {
                services.AddSingleton<ISecrets, SecretsLocalAppSI>();
            }

        }
    }
}
