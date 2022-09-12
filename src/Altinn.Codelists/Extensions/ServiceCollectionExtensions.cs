using Altinn.Codelists.AdministrativeUnits.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddAltinnCodelists(this IServiceCollection services)
        {
            services.AddAdministrativeUnits();

            return services;
        }
    }
}
