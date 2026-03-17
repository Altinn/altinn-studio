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

        builder.Property(e => e.PidHash).HasColumnType("character varying").HasColumnName("pid_hash").IsRequired();

        builder.Property(e => e.Username).HasColumnType("character varying").HasColumnName("username").IsRequired();

        builder.Property(e => e.Created).HasColumnType("timestamptz").HasColumnName("created").IsRequired();

        builder.HasIndex(e => e.PidHash, "idx_user_accounts_pid_hash").IsUnique();

        builder.HasIndex(e => e.Username, "idx_user_accounts_username").IsUnique();
    }
}
