using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class AppActivityConfiguration : IEntityTypeConfiguration<AppActivityDbModel>
{
    public void Configure(EntityTypeBuilder<AppActivityDbModel> builder)
    {
        builder.ToTable("app_activity", "designer");

        builder.HasKey(e => e.Id).HasName("app_activity_pkey");

        builder.Property(e => e.Id).HasColumnName("id").IsRequired().ValueGeneratedOnAdd().UseIdentityColumn();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder
            .Property(e => e.Environment)
            .HasColumnType("character varying")
            .HasColumnName("environment")
            .IsRequired();

        builder.Property(e => e.App).HasColumnType("character varying").HasColumnName("app").IsRequired();

        builder.Property(e => e.LastReadAt).HasColumnType("timestamptz").HasColumnName("last_read_at");

        builder.Property(e => e.LastWriteAt).HasColumnType("timestamptz").HasColumnName("last_write_at");

        builder
            .Property(e => e.LatestWindowCounts)
            .HasColumnType("jsonb")
            .HasColumnName("latest_window_counts")
            .IsRequired();

        builder
            .Property(e => e.LatestWindowDays)
            .HasColumnType("integer")
            .HasColumnName("latest_window_days")
            .IsRequired();

        builder
            .Property(e => e.ObservedSince)
            .HasColumnType("timestamptz")
            .HasColumnName("observed_since")
            .IsRequired();

        builder.Property(e => e.Deployed).HasColumnType("boolean").HasColumnName("deployed").IsRequired();

        builder
            .Property(e => e.FirstCollectedAt)
            .HasColumnType("timestamptz")
            .HasColumnName("first_collected_at")
            .IsRequired();

        builder
            .Property(e => e.LastCollectedAt)
            .HasColumnType("timestamptz")
            .HasColumnName("last_collected_at")
            .IsRequired();

        builder
            .HasIndex(
                e => new
                {
                    e.Org,
                    e.Environment,
                    e.App,
                },
                "idx_app_activity_org_environment_app"
            )
            .IsUnique();
    }
}
