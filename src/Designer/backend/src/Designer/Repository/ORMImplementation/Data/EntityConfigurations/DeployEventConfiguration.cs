using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class DeployEventConfiguration : IEntityTypeConfiguration<DeployEventDbModel>
{
    public void Configure(EntityTypeBuilder<DeployEventDbModel> builder)
    {
        builder.ToTable("deploy_events", "designer");

        builder.HasKey(e => e.Id).HasName("deploy_events_pkey");

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .IsRequired()
            .ValueGeneratedOnAdd()
            .UseIdentityColumn();

        builder.Property(e => e.DeploymentSequenceNo)
            .HasColumnName("deployment_sequenceno")
            .IsRequired();

        builder.Property(e => e.EventType)
            .HasColumnType("character varying")
            .HasColumnName("event_type")
            .IsRequired();

        builder.Property(e => e.Message)
            .HasColumnType("text")
            .HasColumnName("message");

        builder.Property(e => e.Timestamp)
            .HasColumnType("timestamptz")
            .HasColumnName("timestamp")
            .IsRequired();

        builder.Property(e => e.Created)
            .HasColumnType("timestamptz")
            .HasColumnName("created")
            .IsRequired();

        builder.Property(e => e.Origin)
            .HasColumnType("character varying")
            .HasColumnName("origin")
            .IsRequired();

        builder.HasOne(e => e.Deployment)
            .WithMany(d => d.Events)
            .HasForeignKey(e => e.DeploymentSequenceNo)
            .HasConstraintName("fk_deploy_events_deployments");

        builder.HasIndex(e => e.DeploymentSequenceNo, "idx_deploy_events_deployment_sequenceno");
    }
}
