using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace WorkflowEngine.Data.Extensions;

public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds the database-backed repository for the workflow engine.
        /// </summary>
        public IServiceCollection AddDbRepository(string connectionString)
        {
            ArgumentException.ThrowIfNullOrEmpty(connectionString);

            services.AddTransient<IProcessEngineRepository, ProcessEnginePgRepository>();
            services.AddDbContext<ProcessEngineDbContext>(
                options =>
                    options.UseNpgsql(
                        connectionString,
                        npgsqlOptions =>
                        {
                            npgsqlOptions.MigrationsAssembly(typeof(ProcessEngineDbContext).Assembly.FullName);
                            npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
                        }
                    ),
                contextLifetime: ServiceLifetime.Transient,
                optionsLifetime: ServiceLifetime.Singleton
            );

            return services;
        }

        /// <summary>
        /// Adds the in-memory repository for the workflow engine.
        /// </summary>
        public IServiceCollection AddInMemoryRepository()
        {
            services.AddSingleton<IProcessEngineRepository, ProcessEngineInMemoryRepository>();
            return services;
        }
    }
}
