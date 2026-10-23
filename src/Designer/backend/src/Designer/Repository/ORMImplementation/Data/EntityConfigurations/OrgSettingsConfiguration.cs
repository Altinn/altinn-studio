using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class OrgSettingsConfiguration : IEntityTypeConfiguration<OrgSettingsDbModel>
{
    public void Configure(EntityTypeBuilder<OrgSettingsDbModel> builder)
    {
        builder.ToTable("org_settings", "designer");

        builder.HasKey(e => e.Id).HasName("org_settings_pkey");

        builder.Property(e => e.Id).HasColumnName("id").IsRequired().ValueGeneratedOnAdd().UseIdentityColumn();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder
            .Property(e => e.UndeployOnInactivity)
            .HasColumnType("boolean")
            .HasColumnName("undeploy_on_inactivity")
            .IsRequired();

        builder
            .Property(e => e.InactivityPeriodDays)
            .HasColumnType("integer")
            .HasColumnName("inactivity_period_days")
            .IsRequired();

        builder.Property(e => e.Created).HasColumnType("timestamptz").HasColumnName("created").IsRequired();

        builder.Property(e => e.CreatedBy).HasColumnType("character varying").HasColumnName("created_by");

        builder.Property(e => e.LastModifiedBy).HasColumnType("character varying").HasColumnName("last_modified_by");

        builder.HasIndex(e => e.Org, "idx_org_settings_org").IsUnique();
    }
}
