using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class ContactMethodConfiguration : IEntityTypeConfiguration<ContactMethodDbModel>
{
    public void Configure(EntityTypeBuilder<ContactMethodDbModel> builder)
    {
        builder.ToTable("contact_methods", "designer");

        builder.HasKey(e => e.Id).HasName("contact_methods_pkey");

        builder
            .Property(e => e.Id)
            .HasColumnType("uuid")
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()")
            .IsRequired();

        builder.Property(e => e.ContactPointId).HasColumnType("uuid").HasColumnName("contact_point_id").IsRequired();

        builder.Property(e => e.MethodType).HasColumnType("integer").HasColumnName("method_type").IsRequired();

        builder
            .Property(e => e.Value)
            .HasColumnType("character varying")
            .HasMaxLength(255)
            .HasColumnName("value")
            .IsRequired();

        builder
            .HasIndex(e => new { e.ContactPointId, e.MethodType }, "idx_contact_methods_contact_point_id_method_type")
            .IsUnique();
    }
}
