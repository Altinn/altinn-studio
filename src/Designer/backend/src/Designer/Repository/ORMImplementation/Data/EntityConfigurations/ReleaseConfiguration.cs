#nullable disable
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class ReleaseConfiguration : IEntityTypeConfiguration<ReleaseDbModel>
{
    public void Configure(EntityTypeBuilder<ReleaseDbModel> builder)
    {
        builder.HasKey(e => e.Sequenceno).HasName("releases_pkey");

        builder.ToTable("releases", "designer");

        builder.HasIndex(e => new { e.Org, e.App }, "idx_releases_org_app");

        builder.Property(e => e.Sequenceno)
            .HasColumnType("BIGSERIAL")
            .HasColumnName("sequenceno")
            .ValueGeneratedOnAdd();

        builder.Property(e => e.App)
            .HasColumnType("character varying")
            .HasColumnName("app");

        builder.Property(e => e.Buildid)
            .HasColumnType("character varying")
            .HasColumnName("buildid");

        builder.Property(e => e.Buildresult)
            .HasColumnType("character varying")
            .HasColumnName("buildresult");

        builder.Property(e => e.Buildstatus)
            .HasColumnType("character varying")
            .HasColumnName("buildstatus");

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
    }
}
