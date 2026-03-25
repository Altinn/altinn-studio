using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class ContactPointConfiguration : IEntityTypeConfiguration<ContactPointDbModel>
{
    public void Configure(EntityTypeBuilder<ContactPointDbModel> builder)
    {
        builder.ToTable("contact_points", "designer");

        builder.HasKey(e => e.Id).HasName("contact_points_pkey");

        builder
            .Property(e => e.Id)
            .HasColumnType("uuid")
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()")
            .IsRequired();

        builder.Property(e => e.Org).HasColumnType("character varying").HasColumnName("org").IsRequired();

        builder
            .Property(e => e.Name)
            .HasColumnType("character varying")
            .HasMaxLength(100)
            .HasColumnName("name")
            .IsRequired();

        builder.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true).IsRequired();

        builder
            .Property(e => e.CreatedAt)
            .HasColumnType("timestamptz")
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .ValueGeneratedOnAdd()
            .IsRequired();

        builder
            .Property(e => e.Environments)
            .HasColumnType("text[]")
            .HasColumnName("environments")
            .HasDefaultValueSql("'{}'::text[]")
            .IsRequired();

        builder
            .HasMany(e => e.Methods)
            .WithOne(e => e.ContactPoint)
            .HasForeignKey(e => e.ContactPointId)
            .HasConstraintName("fk_contact_methods_contact_point_id")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => e.Org, "idx_contact_points_org");

        builder.HasIndex(e => new { e.Org, e.IsActive }, "idx_contact_points_org_active");
    }
}
