using Altinn.Studio.Designer.Models.UserAccount;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class UserAccountConfiguration : IEntityTypeConfiguration<UserAccountDbModel>
{
    public void Configure(EntityTypeBuilder<UserAccountDbModel> builder)
    {
        builder.ToTable("user_accounts", "designer");

        builder.HasKey(e => e.Id).HasName("user_accounts_pkey");

        builder
            .Property(e => e.Id)
            .HasColumnType("uuid")
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()")
            .IsRequired();

        builder.Property(e => e.PidHash).HasColumnType("character varying").HasColumnName("pid_hash");

        builder.Property(e => e.Username).HasColumnType("character varying").HasColumnName("username").IsRequired();

        builder
            .Property(e => e.AccountType)
            .HasColumnName("account_type")
            .HasDefaultValue(AccountType.User)
            .IsRequired();

        builder.Property(e => e.OrganizationName).HasColumnType("character varying").HasColumnName("organization_name");

        builder.Property(e => e.Deactivated).HasColumnName("deactivated").HasDefaultValue(false).IsRequired();

        builder.Property(e => e.DeactivatedAt).HasColumnType("timestamptz").HasColumnName("deactivated_at");

        builder
            .Property(e => e.CreatedByUserAccountId)
            .HasColumnType("uuid")
            .HasColumnName("created_by_user_account_id");

        builder.Property(e => e.Created).HasColumnType("timestamptz").HasColumnName("created").IsRequired();

        builder.HasIndex(e => e.PidHash, "idx_user_accounts_pid_hash").IsUnique().HasFilter("pid_hash IS NOT NULL");

        builder.HasIndex(e => e.Username, "idx_user_accounts_username").IsUnique();

        builder.HasIndex(e => e.OrganizationName, "idx_user_accounts_organization_name");

        builder
            .HasOne(e => e.CreatedByUserAccount)
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserAccountId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
