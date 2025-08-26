using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class BuildConfiguration : IEntityTypeConfiguration<BuildDbModel>
{
    public void Configure(EntityTypeBuilder<BuildDbModel> builder)
    {
        builder.ToTable("builds", "designer");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityColumn()
            .ValueGeneratedOnAdd();

        builder.Property(e => e.ExternalId)
            .HasColumnType("character varying")
            .HasColumnName("external_id");

        builder.Property(e => e.Status)
            .HasColumnType("character varying")
            .HasColumnName("status");

        builder.Property(e => e.Result)
            .HasColumnType("character varying")
            .HasColumnName("result");

        builder.Property(e => e.BuildType)
            .HasColumnType("integer")
            .HasColumnName("build_type");

        builder.Property(e => e.Started)
            .HasColumnType("timestamptz")
            .HasColumnName("started");

        builder.Property(e => e.Finished)
            .HasColumnType("timestamptz")
            .HasColumnName("finished");

        builder.HasIndex(b => new { b.ExternalId, b.BuildType })
            .IsUnique();

        builder.HasIndex(b => b.BuildType);
    }
}
