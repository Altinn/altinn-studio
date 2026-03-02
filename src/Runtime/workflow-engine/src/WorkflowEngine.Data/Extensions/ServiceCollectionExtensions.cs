using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Data.Extensions;

public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds the database-backed repository for the workflow engine.
        /// </summary>
        public IServiceCollection AddDbRepository(bool enableSensitiveDataLogging = false)
        {
            services.AddSingleton(sp =>
            {
                var connectionString =
                    sp.GetRequiredService<IConfiguration>().GetConnectionString("WorkflowEngine")
                    ?? throw new EngineConfigurationException(
                        "Database connection string 'WorkflowEngine' is required, but has not been configured."
                    );

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

            services.AddTransient<IEngineRepository, EnginePgRepository>();
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
