using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class DeveloperIdentityMappingConfiguration : IEntityTypeConfiguration<DeveloperIdentityMappingDbModel>
{
    public void Configure(EntityTypeBuilder<DeveloperIdentityMappingDbModel> builder)
    {
        builder.ToTable("developer_identity_mappings", "designer");

        builder.HasKey(e => e.PidHash).HasName("developer_identity_mappings_pkey");

        builder.Property(e => e.PidHash)
            .HasColumnType("character varying")
            .HasColumnName("pid_hash")
            .IsRequired();

        builder.Property(e => e.Username)
            .HasColumnType("character varying")
            .HasColumnName("username")
            .IsRequired();

        builder.Property(e => e.Created)
            .HasColumnType("timestamptz")
            .HasColumnName("created")
            .IsRequired();

        builder.HasIndex(e => e.Username, "idx_developer_identity_mappings_username")
            .IsUnique();
    }
}
