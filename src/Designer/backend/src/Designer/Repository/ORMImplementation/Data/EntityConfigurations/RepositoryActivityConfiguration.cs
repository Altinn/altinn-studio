using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class RepositoryActivityConfiguration : IEntityTypeConfiguration<RepositoryActivityDbModel>
{
    public void Configure(EntityTypeBuilder<RepositoryActivityDbModel> builder)
    {
        builder.ToTable("repository_activity", "designer");

        builder
            .HasKey(e => new
            {
                e.Developer,
                e.Org,
                e.Repository,
            })
            .HasName("repository_activity_pkey");

        builder.Property(e => e.Developer).HasColumnType("character varying").HasColumnName("developer").IsRequired();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder.Property(e => e.Repository).HasColumnType("character varying").HasColumnName("repository").IsRequired();

        builder
            .Property(e => e.LastAccessedAt)
            .HasColumnType("timestamptz")
            .HasColumnName("last_accessed_at")
            .IsRequired();

        builder.Property(e => e.CleanupPending).HasColumnType("boolean").HasColumnName("cleanup_pending").IsRequired();

        builder.HasIndex(e => e.LastAccessedAt, "idx_repository_activity_last_accessed_at");
    }
}
