using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class AdminAuditLogConfiguration : IEntityTypeConfiguration<AdminAuditLogDbModel>
{
    public void Configure(EntityTypeBuilder<AdminAuditLogDbModel> builder)
    {
        builder.ToTable("admin_audit_log", "designer");

        builder.HasKey(e => e.Id).HasName("admin_audit_log_pkey");

        builder.Property(e => e.Id).HasColumnName("id").IsRequired().ValueGeneratedOnAdd().UseIdentityColumn();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder.Property(e => e.App).HasColumnType("character varying").HasColumnName("app").IsRequired();

        builder
            .Property(e => e.InstanceId)
            .HasColumnType("character varying")
            .HasColumnName("instance_id")
            .IsRequired();

        builder.Property(e => e.Action).HasColumnType("character varying").HasColumnName("action").IsRequired();

        builder.Property(e => e.UserName).HasColumnType("character varying").HasColumnName("user_name").IsRequired();

        builder.Property(e => e.Env).HasColumnType("character varying").HasColumnName("env").IsRequired();

        builder.Property(e => e.Timestamp).HasColumnType("timestamptz").HasColumnName("timestamp").IsRequired();

        builder.HasIndex(
            e => new
            {
                e.Org,
                e.App,
                e.Timestamp,
            },
            "idx_admin_audit_log_org_app_timestamp"
        );
    }
}
