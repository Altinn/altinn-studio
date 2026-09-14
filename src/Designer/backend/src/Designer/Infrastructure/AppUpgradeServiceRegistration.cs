using System;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.Studio.Designer.Infrastructure;

public static class AppUpgradeServiceRegistration
{
    public static IServiceCollection AddAppUpgrade(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AppUpgradeSettings>(configuration.GetSection("AppUpgradeSettings"));
        services.TryAddSingleton(TimeProvider.System);
        services.AddTransient<IAppUpgradeService, AppUpgradeService>();
        return services;
    }
}
