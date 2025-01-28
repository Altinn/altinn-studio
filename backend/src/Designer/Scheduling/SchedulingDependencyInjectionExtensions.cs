using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

public static class SchedulingDependencyInjectionExtensions
{
    public static IServiceCollection AddQuartzJobScheduling(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddQuartz(configure =>
        {
            SchedulingSettings schedulingSettings = configuration.GetSection(nameof(SchedulingSettings)).Get<SchedulingSettings>();
            if (schedulingSettings.UsePersistentScheduling)
            {
                PostgreSQLSettings postgresSettings =
                    configuration.GetSection(nameof(PostgreSQLSettings)).Get<PostgreSQLSettings>();
                configure.UsePersistentStore(s =>
                {
                    s.UseSystemTextJsonSerializer();
                    s.UsePostgres(postgresSettings.FormattedConnectionString());
                    s.UseClustering();
                });
            }
        });
        services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);
        return services;
    }
}
