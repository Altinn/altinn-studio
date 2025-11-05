#nullable disable
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class AppScopesConfiguration : IEntityTypeConfiguration<AppScopesDbModel>
{
    public void Configure(EntityTypeBuilder<AppScopesDbModel> builder)
    {
        builder.ToTable("app_scopes", "designer");

        builder.HasKey(e => e.Id).HasName("app_scopes_pkey");

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .IsRequired()
            .ValueGeneratedOnAdd()
            .UseIdentityColumn();

        builder.Property(e => e.App)
            .HasColumnType("character varying")
            .HasColumnName("app")
            .IsRequired();

        builder.Property(e => e.Org)
            .HasColumnType("character varying")
            .HasColumnName("org")
            .IsRequired();

        builder.Property(e => e.Created)
            .HasColumnType("timestamptz")
            .HasColumnName("created");

        builder.Property(e => e.Scopes)
            .HasColumnType("jsonb")
            .HasColumnName("scopes")
            .IsRequired();

        builder.Property(e => e.CreatedBy)
            .HasColumnType("character varying")
            .HasColumnName("created_by");

        builder.Property(e => e.LastModifiedBy)
            .HasColumnType("character varying")
            .HasColumnName("last_modified_by");

        builder.Property(e => e.Version)
            .IsRowVersion();

        builder.HasIndex(e => new { e.Org, e.App }, "idx_app_scopes_org_app")
            .IsUnique();
    }
}
