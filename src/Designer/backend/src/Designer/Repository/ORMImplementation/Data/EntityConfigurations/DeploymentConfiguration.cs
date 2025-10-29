#nullable disable
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class DeploymentConfiguration : IEntityTypeConfiguration<DeploymentDbModel>
{
    public void Configure(EntityTypeBuilder<DeploymentDbModel> builder)
    {
        builder.HasKey(e => e.Sequenceno).HasName("deployments_pkey");

        builder.ToTable("deployments", "designer");

        builder.HasIndex(e => new { e.Org, e.App }, "idx_deployments_org_app");

        builder.Property(e => e.Sequenceno)
            .HasColumnType("BIGSERIAL")
            .HasColumnName("sequenceno")
            .ValueGeneratedOnAdd();

        builder.Property(e => e.App)
            .HasColumnType("character varying")
            .HasColumnName("app");

        builder.Property(e => e.EnvName)
            .HasColumnType("character varying")
            .HasColumnName("envname");

        builder.Property(e => e.Buildid)
            .HasColumnType("character varying")
            .HasColumnName("buildid");

        builder.Property(e => e.Buildresult)
            .HasColumnType("character varying")
            .HasColumnName("buildresult");

        builder.Property(e => e.Created)
            .HasColumnType("timestamptz")
            .HasColumnName("created");

        builder.Property(e => e.Entity)
            .HasColumnType("text")
            .HasColumnName("entity");

        builder.Property(e => e.Org)
            .HasColumnType("character varying")
            .HasColumnName("org");

        builder.Property(e => e.Tagname)
            .HasColumnType("character varying")
            .HasColumnName("tagname");

        builder.Property(e => e.CreatedBy)
            .HasColumnType("character varying")
            .HasColumnName("created_by");

        builder.Property(e => e.InternalBuildId)
            .HasColumnName("internal_build_id");

        builder.HasOne(d => d.Build)
            .WithMany()
            .HasForeignKey(d => d.InternalBuildId)
            .HasConstraintName("fk_deployments_builds_buildid");

        builder.Property(e => e.DeploymentType)
            .HasColumnType("integer")
            .HasColumnName("deployment_type")
            .HasDefaultValue(DeploymentType.Deploy);
    }
}
