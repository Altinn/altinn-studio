using Altinn.App.ProcessEngine.Constants;
using Altinn.App.ProcessEngine.Controllers;
using Altinn.App.ProcessEngine.Controllers.Auth;
using Altinn.App.ProcessEngine.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WorkflowEngine.Models;

namespace Altinn.App.ProcessEngine.Extensions;

/// <summary>
/// Extension methods for registering the process engine and its dependencies in the service collection.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds the process engine services to the service collection.
    /// </summary>
    public static IServiceCollection AddProcessEngine(
        this IServiceCollection services,
        bool useDatabase = false,
        string? dbConnectionString = null
    )
    {
        if (services.IsConfigured<ProcessEngineSettings>() is false)
        {
            services.ConfigureProcessEngine("ProcessEngineSettings");
        }

        services.AddSingleton<IProcessEngine, ProcessEngine>();
        services.AddSingleton<IProcessEngineTaskHandler, ProcessEngineTaskHandler>();

        services.AddHostedService<ProcessEngineHost>();

        // Add repository and EF if requested
        if (useDatabase)
        {
            ArgumentException.ThrowIfNullOrEmpty(dbConnectionString);

            services.AddTransient<IProcessEngineRepository, ProcessEnginePgRepository>();
            services.AddDbContext<ProcessEngineDbContext>(
                options =>
                    options.UseNpgsql(
                        dbConnectionString,
                        npgsqlOptions =>
                        {
                            npgsqlOptions.MigrationsAssembly(typeof(ProcessEngineDbContext).Assembly.FullName);
                            npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
                        }
                    ),
                contextLifetime: ServiceLifetime.Transient,
                optionsLifetime: ServiceLifetime.Singleton
            );
        }
        else
        {
            services.AddSingleton<IProcessEngineRepository, ProcessEngineInMemoryRepository>();
        }

        // Add API key authentication
        services
            .AddAuthentication()
            .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(AuthConstants.ApiKeySchemeName, null);

        // Register controllers from this assembly
        services
            .AddControllers()
            .PartManager.ApplicationParts.Add(new AssemblyPart(typeof(ProcessEngineController).Assembly));

        return services;
    }

    /// <summary>
    /// Configures the process engine settings by binding to a configuration section.
    /// </summary>
    public static IServiceCollection ConfigureProcessEngine(this IServiceCollection services, string configSectionPath)
    {
        services.AddOptions<ProcessEngineSettings>().BindConfiguration(configSectionPath);

        return services;
    }

    /// <summary>
    /// Configures the process engine settings using a delegate.
    /// </summary>
    public static IServiceCollection ConfigureProcessEngine(
        this IServiceCollection services,
        Action<ProcessEngineSettings> configureOptions
    )
    {
        services.AddOptions<ProcessEngineSettings>().Configure(configureOptions);
        return services;
    }

    /// <summary>
    /// Checks if the specified options type has already been configured in the service collection.
    /// </summary>
    internal static bool IsConfigured<TOptions>(this IServiceCollection services)
        where TOptions : class
    {
        return services.Any(d =>
            d.ServiceType == typeof(IConfigureOptions<TOptions>)
            || d.ServiceType == typeof(IOptionsChangeTokenSource<TOptions>)
        );
    }
}
