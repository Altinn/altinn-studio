using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class PersonalAccessTokenConfiguration : IEntityTypeConfiguration<PersonalAccessTokenDbModel>
{
    public void Configure(EntityTypeBuilder<PersonalAccessTokenDbModel> builder)
    {
        builder.ToTable("personal_access_tokens", "designer");

        builder.HasKey(e => e.Id).HasName("personal_access_tokens_pkey");

        builder.Property(e => e.Id).HasColumnName("id").UseIdentityAlwaysColumn();

        builder.Property(e => e.KeyHash).HasColumnType("character varying").HasColumnName("key_hash").IsRequired();

        builder.Property(e => e.UserAccountId).HasColumnType("uuid").HasColumnName("user_account_id").IsRequired();

        builder.Property(e => e.Name).HasColumnType("character varying").HasColumnName("name").IsRequired();

        builder
            .Property(e => e.TokenType)
            .HasColumnName("token_type")
            .HasDefaultValue(Enums.PersonalAccessTokenType.User)
            .IsRequired();

        builder.Property(e => e.ExpiresAt).HasColumnType("timestamptz").HasColumnName("expires_at").IsRequired();

        builder.Property(e => e.Revoked).HasColumnName("revoked").HasDefaultValue(false).IsRequired();

        builder.Property(e => e.CreatedAt).HasColumnType("timestamptz").HasColumnName("created_at").IsRequired();

        builder.HasIndex(e => e.KeyHash, "idx_personal_access_tokens_key_hash").IsUnique();

        builder.HasIndex(e => e.UserAccountId, "idx_personal_access_tokens_user_account_id");

        builder
            .HasIndex(e => new { e.UserAccountId, e.Name }, "idx_personal_access_tokens_unique_name_per_user")
            .IsUnique()
            .HasFilter("revoked = false");

        builder
            .HasOne(e => e.UserAccount)
            .WithMany()
            .HasForeignKey(e => e.UserAccountId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
