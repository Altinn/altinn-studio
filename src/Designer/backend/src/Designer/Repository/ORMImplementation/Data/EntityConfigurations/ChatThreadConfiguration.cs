using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class ChatThreadConfiguration : IEntityTypeConfiguration<ChatThreadDbModel>
{
    public void Configure(EntityTypeBuilder<ChatThreadDbModel> builder)
    {
        builder.ToTable("chat_threads", "designer");

        builder.HasKey(e => e.Id);

        builder.HasIndex(e => new { e.Org, e.App, e.CreatedBy }, "idx_chat_threads_org_app_created_by");

        builder.Property(e => e.Id)
            .HasColumnType("uuid")
            .HasColumnName("id")
            .IsRequired();

        builder.Property(e => e.Org)
            .HasColumnType("character varying")
            .HasColumnName("org")
            .IsRequired();

        builder.Property(e => e.App)
            .HasColumnType("character varying")
            .HasColumnName("app")
            .IsRequired();

        builder.Property(e => e.CreatedBy)
            .HasColumnType("character varying")
            .HasColumnName("created_by")
            .IsRequired();

        builder.Property(e => e.Title)
            .HasColumnType("character varying")
            .HasColumnName("title")
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnType("timestamptz")
            .HasColumnName("created_at")
            .IsRequired();
    }
}
