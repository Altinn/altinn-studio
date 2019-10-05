using AltinnCore.Designer.ModelBinding;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace AltinnCore.Designer.Infrastructure
{
    /// <summary>
    /// Contains extension methods for configuring Mvc
    /// </summary>
    public static class MvcConfiguration
    {
        /// <summary>
        /// Extension method that configures Mvc
        /// </summary>
        /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
        public static IServiceCollection ConfigureMvc(this IServiceCollection services)
        {
            var mvc = services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_2);
            mvc.Services.Configure<MvcOptions>(options =>
            {
                // Adding custom modelbinders
                options.ModelBinderProviders.Insert(0, new AltinnCoreApiModelBinderProvider());
                options.ModelBinderProviders.Insert(1, new AltinnCoreCollectionModelBinderProvider());
            });
            mvc.AddXmlSerializerFormatters();

            return services;
        }
    }
}
