using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;

namespace WorkflowEngine.Data.Extensions;

public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds the database-backed repository for the workflow engine.
        /// </summary>
        /// <param name="connectionStringFactory">
        /// Factory that resolves the database connection string from the service provider.
        /// Called once when the <see cref="NpgsqlDataSource"/> singleton is first resolved.
        /// </param>
        /// <param name="enableSensitiveDataLogging">Enable EF Core sensitive data logging.</param>
        public IServiceCollection AddDbRepository(
            Func<IServiceProvider, string> connectionStringFactory,
            bool enableSensitiveDataLogging = false
        )
        {
            services.AddSingleton(sp =>
            {
                var connectionString = connectionStringFactory(sp);
                var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString)
                {
                    ConnectionStringBuilder =
                    {
                        MaxPoolSize = 100,
                        MinPoolSize = 10,
                        Timeout = 30,
                        KeepAlive = 60,
                    },
                };

                return dataSourceBuilder.Build();
            });

            services.AddSingleton<IEngineRepository, EngineRepository>();
            services.AddDbContext<EngineDbContext>(
                (sp, options) =>
                {
                    options.UseNpgsql(sp.GetRequiredService<NpgsqlDataSource>());
                    if (enableSensitiveDataLogging)
                        options.EnableSensitiveDataLogging();
                },
                contextLifetime: ServiceLifetime.Transient,
                optionsLifetime: ServiceLifetime.Singleton
            );
            services.AddDbContextFactory<EngineDbContext>(
                (sp, options) =>
                {
                    options.UseNpgsql(sp.GetRequiredService<NpgsqlDataSource>());
                    if (enableSensitiveDataLogging)
                        options.EnableSensitiveDataLogging();
                }
            );
            services.AddScoped<DbMigrationService>();
            services.AddScoped<DbConnectionResetService>();
            services.AddHostedService<DbMaintenanceService>();

            return services;
        }

        /// <summary>
        /// Adds a health check for the EngineDbContext, testing database connectivity.
        /// </summary>
        public IServiceCollection AddDbContextHealthCheck(string name, IEnumerable<string>? tags = null)
        {
            services.AddHealthChecks().AddDbContextCheck<EngineDbContext>(name, tags: tags);

            return services;
        }
    }
}
