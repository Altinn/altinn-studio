using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class AppSettingsConfiguration : IEntityTypeConfiguration<AppSettingsDbModel>
{
    public void Configure(EntityTypeBuilder<AppSettingsDbModel> builder)
    {
        builder.ToTable("app_settings", "designer");

        builder.HasKey(e => e.Id).HasName("app_settings_pkey");

        builder.Property(e => e.Id).HasColumnName("id").IsRequired().ValueGeneratedOnAdd().UseIdentityColumn();

        builder.Property(e => e.App).HasColumnType("character varying").HasColumnName("app").IsRequired();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder.Property(e => e.Environment).HasColumnType("character varying").HasColumnName("environment");

        builder
            .Property(e => e.UndeployOnInactivity)
            .HasColumnType("boolean")
            .HasColumnName("undeploy_on_inactivity")
            .IsRequired();

        builder.Property(e => e.Created).HasColumnType("timestamptz").HasColumnName("created").IsRequired();

        builder.Property(e => e.CreatedBy).HasColumnType("character varying").HasColumnName("created_by");

        builder.Property(e => e.LastModifiedBy).HasColumnType("character varying").HasColumnName("last_modified_by");

        builder.Property(e => e.Version).IsRowVersion();

        // Separate unique indexes are required to enforce uniqueness for nullable environment.
        builder
            .HasIndex(e => new { e.Org, e.App }, "idx_app_settings_org_app_global")
            .HasFilter("\"environment\" IS NULL")
            .IsUnique();

        builder
            .HasIndex(
                e => new
                {
                    e.Org,
                    e.App,
                    e.Environment,
                },
                "idx_app_settings_org_app_environment"
            )
            .HasFilter("\"environment\" IS NOT NULL")
            .IsUnique();
    }
}
