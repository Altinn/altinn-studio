using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class OrgAlertPersonConfiguration : IEntityTypeConfiguration<OrgAlertPersonDbModel>
{
    public void Configure(EntityTypeBuilder<OrgAlertPersonDbModel> builder)
    {
        builder.ToTable("org_alert_persons", "designer");

        builder.HasKey(e => e.Id).HasName("org_alert_persons_pkey");

        builder
            .Property(e => e.Id)
            .HasColumnType("uuid")
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()")
            .IsRequired();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder.Property(e => e.Name).HasColumnType("character varying").HasColumnName("name").IsRequired();

        builder.Property(e => e.Email).HasColumnType("character varying").HasColumnName("email");

        builder.Property(e => e.EmailSeverity).HasColumnName("email_severity").IsRequired();

        builder.Property(e => e.Phone).HasColumnType("character varying").HasColumnName("phone");

        builder.Property(e => e.SmsSeverity).HasColumnName("sms_severity").IsRequired();

        builder.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true).IsRequired();

        builder.Property(e => e.CreatedAt).HasColumnType("timestamptz").HasColumnName("created_at").IsRequired();

        builder.Property(e => e.Services).HasColumnType("jsonb").HasColumnName("services");

        builder.HasIndex(e => e.Org, "idx_org_alert_persons_org");

        builder.HasIndex(e => new { e.Org, e.IsActive }, "idx_org_alert_persons_org_active");
    }
}
