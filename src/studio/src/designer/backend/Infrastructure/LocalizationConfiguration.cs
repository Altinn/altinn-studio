using System.Collections.Generic;
using System.Globalization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.DependencyInjection;

namespace AltinnCore.Designer.Infrastructure
{
    /// <summary>
    /// Contains extension methods for configuring localization
    /// </summary>
    public static class LocalizationConfiguration
    {
        /// <summary>
        /// Extension method that configures localization
        /// </summary>
        /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
        public static IServiceCollection ConfigureLocalization(this IServiceCollection services)
        {
            services.AddLocalization();
            services.Configure<RequestLocalizationOptions>(
                options =>
                {
                    List<CultureInfo> supportedCultures = new List<CultureInfo>
                        {
                            // The current supported languages. Can easily be added more.
                            new CultureInfo("en-US"),
                            new CultureInfo("nb-NO"),
                            new CultureInfo("nn-NO"),
                        };

                    options.DefaultRequestCulture = new RequestCulture(culture: "nb-NO", uiCulture: "nb-NO");
                    options.SupportedCultures = supportedCultures;
                    options.SupportedUICultures = supportedCultures;
                });

            return services;
        }
    }
}
