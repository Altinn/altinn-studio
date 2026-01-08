using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Repository;

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

            services.AddTransient<IWorkflowEngineRepository, WorkflowEnginePgRepository>();
            services.AddDbContext<WorkflowEngineDbContext>(
                options =>
                    options.UseNpgsql(
                        connectionString,
                        npgsqlOptions =>
                        {
                            npgsqlOptions.MigrationsAssembly(typeof(WorkflowEngineDbContext).Assembly.FullName);
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
            services.AddSingleton<IWorkflowEngineRepository, WorkflowEngineInMemoryRepository>();
            return services;
        }
    }
}
