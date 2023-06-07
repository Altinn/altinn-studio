using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Filters.UserRequestContext
{
    public static class ServinceCollectionExtensions
    {
        public static IServiceCollection AddUserRequestContext(this IServiceCollection services)
        {
            services.AddScoped<IUserRequestContext, UserRequestContext>();
            return services;
        }
    }
}
