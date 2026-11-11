using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class AppDailyTaskMetricsConfiguration : IEntityTypeConfiguration<AppDailyTaskMetricsDbModel>
{
    public void Configure(EntityTypeBuilder<AppDailyTaskMetricsDbModel> builder)
    {
        builder.ToTable("app_daily_task_metrics", "designer");

        builder.HasKey(e => e.Id).HasName("app_daily_task_metrics_pkey");

        builder.Property(e => e.Id).HasColumnName("id").IsRequired().ValueGeneratedOnAdd().UseIdentityColumn();

        builder.Property(e => e.MetricDate).HasColumnType("date").HasColumnName("metric_date").IsRequired();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder
            .Property(e => e.Environment)
            .HasColumnType("character varying")
            .HasColumnName("environment")
            .IsRequired();

        builder.Property(e => e.App).HasColumnType("character varying").HasColumnName("app").IsRequired();

        builder.Property(e => e.TaskId).HasColumnType("character varying").HasColumnName("task_id").IsRequired();

        builder.Property(e => e.OpenInstances).HasColumnType("integer").HasColumnName("open_instances").IsRequired();

        builder
            .HasIndex(
                e => new
                {
                    e.MetricDate,
                    e.Org,
                    e.Environment,
                    e.App,
                    e.TaskId,
                },
                "idx_app_daily_task_metrics_date_org_environment_app_task"
            )
            .IsUnique();
    }
}
