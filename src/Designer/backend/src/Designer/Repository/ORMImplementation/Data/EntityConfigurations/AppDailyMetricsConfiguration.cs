using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class AppDailyMetricsConfiguration : IEntityTypeConfiguration<AppDailyMetricsDbModel>
{
    public void Configure(EntityTypeBuilder<AppDailyMetricsDbModel> builder)
    {
        builder.ToTable("app_daily_metrics", "designer");

        builder.HasKey(e => e.Id).HasName("app_daily_metrics_pkey");

        builder.Property(e => e.Id).HasColumnName("id").IsRequired().ValueGeneratedOnAdd().UseIdentityColumn();

        builder.Property(e => e.MetricDate).HasColumnType("date").HasColumnName("metric_date").IsRequired();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder
            .Property(e => e.Environment)
            .HasColumnType("character varying")
            .HasColumnName("environment")
            .IsRequired();

        builder.Property(e => e.App).HasColumnType("character varying").HasColumnName("app").IsRequired();

        builder
            .Property(e => e.InstancesCreated)
            .HasColumnType("integer")
            .HasColumnName("instances_created")
            .IsRequired();

        builder
            .Property(e => e.InstancesCompleted)
            .HasColumnType("integer")
            .HasColumnName("instances_completed")
            .IsRequired();

        builder.Property(e => e.SecondsToCompleteP50).HasColumnType("integer").HasColumnName("seconds_to_complete_p50");

        builder.Property(e => e.ComputedAt).HasColumnType("timestamptz").HasColumnName("computed_at").IsRequired();

        builder
            .HasIndex(
                e => new
                {
                    e.MetricDate,
                    e.Org,
                    e.Environment,
                    e.App,
                },
                "idx_app_daily_metrics_date_org_environment_app"
            )
            .IsUnique();

        builder.HasIndex(
            e => new
            {
                e.Org,
                e.Environment,
                e.MetricDate,
            },
            "idx_app_daily_metrics_org_environment_date"
        );
    }
}
