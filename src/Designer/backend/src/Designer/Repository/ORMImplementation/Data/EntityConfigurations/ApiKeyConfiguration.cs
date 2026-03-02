using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class ApiKeyConfiguration : IEntityTypeConfiguration<ApiKeyDbModel>
{
    public void Configure(EntityTypeBuilder<ApiKeyDbModel> builder)
    {
        builder.ToTable("api_keys", "designer");

        builder.HasKey(e => e.Id).HasName("api_keys_pkey");

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();

        builder.Property(e => e.KeyHash)
            .HasColumnType("character varying")
            .HasColumnName("key_hash")
            .IsRequired();

        builder.Property(e => e.Username)
            .HasColumnType("character varying")
            .HasColumnName("username")
            .IsRequired();

        builder.Property(e => e.DisplayName)
            .HasColumnType("character varying")
            .HasColumnName("display_name")
            .IsRequired();

        builder.Property(e => e.ExpiresAt)
            .HasColumnType("timestamptz")
            .HasColumnName("expires_at")
            .IsRequired();

        builder.Property(e => e.Revoked)
            .HasColumnName("revoked")
            .HasDefaultValue(false)
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnType("timestamptz")
            .HasColumnName("created_at")
            .IsRequired();

        builder.HasIndex(e => e.KeyHash, "idx_api_keys_key_hash")
            .IsUnique();

        builder.HasIndex(e => e.Username, "idx_api_keys_username");
    }
}
