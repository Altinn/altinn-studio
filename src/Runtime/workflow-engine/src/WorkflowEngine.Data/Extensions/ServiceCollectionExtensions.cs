using Azure.Core;
using Azure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Extensions;

internal static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds the database-backed repository for the workflow engine.
        /// Resolves <see cref="EngineConnectionString"/> and <see cref="EngineSettings"/> from DI
        /// to configure the Npgsql data source. The connection pool size is set to match
        /// <see cref="ConcurrencySettings.MaxDbOperations"/>, since all database access is
        /// gated by the concurrency limiter's DB semaphore.
        /// </summary>
        /// <param name="enableSensitiveDataLogging">Enable EF Core sensitive data logging.</param>
        /// <param name="enableAzureWorkloadIdentity">Enable Azure workload identity for passwordless connections.</param>
        public IServiceCollection AddDbRepository(
            bool enableSensitiveDataLogging = false,
            bool enableAzureWorkloadIdentity = true
        )
        {
            services.TryAddSingleton<WorkloadIdentityCredential>();
            services.AddSingleton(sp =>
            {
                var connectionString = sp.GetRequiredService<EngineConnectionString>().Value;
                var settings = sp.GetRequiredService<IOptions<EngineSettings>>().Value;
                var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString)
                {
                    ConnectionStringBuilder =
                    {
                        MaxPoolSize = settings.Concurrency.MaxDbOperations,
                        Timeout = 30,
                        KeepAlive = 60,
                    },
                };

                if (
                    enableAzureWorkloadIdentity
                    && string.IsNullOrEmpty(dataSourceBuilder.ConnectionStringBuilder.Password)
                )
                {
                    var credential = sp.GetRequiredService<WorkloadIdentityCredential>();
                    dataSourceBuilder.UsePeriodicPasswordProvider(
                        async (_, cancellationToken) =>
                        {
                            var accessToken = await credential.GetTokenAsync(
                                new TokenRequestContext(["https://ossrdbms-aad.database.windows.net/.default"]),
                                cancellationToken
                            );
                            return accessToken.Token;
                        },
                        TimeSpan.FromMinutes(55),
                        TimeSpan.FromSeconds(5)
                    );
                }

                return dataSourceBuilder.Build();
            });

            services.AddSingleton<IEngineRepository, EngineRepository>();
            services.AddDbContext<EngineDbContext>(
                (sp, options) =>
                {
                    options.UseNpgsql(
                        sp.GetRequiredService<NpgsqlDataSource>(),
                        o => o.MigrationsHistoryTable("__EFMigrationsHistory", SchemaNames.Engine)
                    );
                    if (enableSensitiveDataLogging)
                        options.EnableSensitiveDataLogging();
                },
                contextLifetime: ServiceLifetime.Transient,
                optionsLifetime: ServiceLifetime.Singleton
            );
            services.AddDbContextFactory<EngineDbContext>(
                (sp, options) =>
                {
                    options.UseNpgsql(
                        sp.GetRequiredService<NpgsqlDataSource>(),
                        o => o.MigrationsHistoryTable("__EFMigrationsHistory", SchemaNames.Engine)
                    );
                    if (enableSensitiveDataLogging)
                        options.EnableSensitiveDataLogging();
                }
            );
            services.AddSingleton<SqlBulkInserter>();
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
