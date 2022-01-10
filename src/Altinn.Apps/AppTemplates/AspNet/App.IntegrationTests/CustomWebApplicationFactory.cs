using System.Linq;
using Altinn.App.PlatformServices.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.IntegrationTests
{
    public class CustomWebApplicationFactory<TStartup> : WebApplicationFactory<TStartup>
        where TStartup : class
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                var defaultProviderService = services.Where(s => s.ServiceType == typeof(IAppOptionsProvider)).FirstOrDefault();
                if (defaultProviderService == null)
                {
                    services.AddTransient<IAppOptionsProvider, DefaultAppOptionsProvider>();
                }                
            });
        }
    }
}
