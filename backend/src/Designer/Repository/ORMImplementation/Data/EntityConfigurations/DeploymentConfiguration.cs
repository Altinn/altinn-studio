using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class DeploymentConfiguration : IEntityTypeConfiguration<Deployment>
{
    public void Configure(EntityTypeBuilder<Deployment> builder)
    {
        builder.HasKey(e => e.Sequenceno).HasName("deployments_pkey");

        builder.ToTable("deployments", "designer");

        builder.HasIndex(e => new { e.Org, e.App }, "idx_deployments_org_app");

        builder.Property(e => e.Sequenceno).HasColumnName("sequenceno");
        builder.Property(e => e.App)
            .HasColumnType("character varying")
            .HasColumnName("app");
        builder.Property(e => e.Buildid)
            .HasColumnType("character varying")
            .HasColumnName("buildid");
        builder.Property(e => e.Buildresult)
            .HasColumnType("character varying")
            .HasColumnName("buildresult");
        builder.Property(e => e.Created).HasColumnName("created");
        builder.Property(e => e.Entity).HasColumnName("entity");
        builder.Property(e => e.Org)
            .HasColumnType("character varying")
            .HasColumnName("org");
        builder.Property(e => e.Tagname)
            .HasColumnType("character varying")
            .HasColumnName("tagname");
    }
}
