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
        public IServiceCollection AddDbRepository(string connectionString, bool enableSensitiveDataLogging = false)
        {
            ArgumentException.ThrowIfNullOrEmpty(connectionString);

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
            var dataSource = dataSourceBuilder.Build();

            services.AddSingleton(dataSource);
            services.AddTransient<IEngineRepository, EnginePgRepository>();
            services.AddDbContext<EngineDbContext>(
                options =>
                {
                    options.UseNpgsql(dataSource);
                    if (enableSensitiveDataLogging)
                        options.EnableSensitiveDataLogging();
                },
                contextLifetime: ServiceLifetime.Transient,
                optionsLifetime: ServiceLifetime.Singleton
            );
            services.AddScoped<DbMigrationService>();
            services.AddScoped<DbConnectionResetService>();

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
