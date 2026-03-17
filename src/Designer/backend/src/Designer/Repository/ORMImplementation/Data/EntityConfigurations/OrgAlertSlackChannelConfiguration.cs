using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class OrgAlertSlackChannelConfiguration : IEntityTypeConfiguration<OrgAlertSlackChannelDbModel>
{
    public void Configure(EntityTypeBuilder<OrgAlertSlackChannelDbModel> builder)
    {
        builder.ToTable("org_alert_slack_channels", "designer");

        builder.HasKey(e => e.Id).HasName("org_alert_slack_channels_pkey");

        builder
            .Property(e => e.Id)
            .HasColumnType("uuid")
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()")
            .IsRequired();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder
            .Property(e => e.ChannelName)
            .HasColumnType("character varying")
            .HasColumnName("channel_name")
            .IsRequired();

        builder.Property(e => e.SlackId).HasColumnType("character varying").HasColumnName("slack_id").IsRequired();

        builder.Property(e => e.Severity).HasColumnName("severity").IsRequired();

        builder.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true).IsRequired();

        builder.Property(e => e.CreatedAt).HasColumnType("timestamptz").HasColumnName("created_at").IsRequired();

        builder.Property(e => e.Services).HasColumnType("jsonb").HasColumnName("services");

        builder.HasIndex(e => e.Org, "idx_org_alert_slack_channels_org");

        builder
            .HasIndex(e => new { e.Org, e.SlackId }, "idx_org_alert_slack_channels_unique_slack_id_per_org")
            .IsUnique();
    }
}
