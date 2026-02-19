#nullable disable
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessageDbModel>
{
    public void Configure(EntityTypeBuilder<ChatMessageDbModel> builder)
    {
        builder.ToTable("chat_messages", "designer");

        builder.HasKey(e => e.Id);

        builder.HasOne<ChatThreadDbModel>()
            .WithMany()
            .HasForeignKey(e => e.ThreadId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => e.ThreadId, "idx_chat_messages_thread_id");

        builder.Property(e => e.Id)
            .HasColumnType("BIGSERIAL")
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        builder.Property(e => e.ThreadId)
            .HasColumnType("bigint")
            .HasColumnName("thread_id");

        builder.Property(e => e.CreatedAt)
            .HasColumnType("timestamptz")
            .HasColumnName("created_at");

        builder.Property(e => e.Role)
            .HasColumnType("integer")
            .HasColumnName("role");

        builder.Property(e => e.Content)
            .HasColumnType("character varying")
            .HasColumnName("content");

        builder.Property(e => e.ActionMode)
            .HasColumnType("integer")
            .HasColumnName("action_mode");

        builder.Property(e => e.FilesChanged)
            .HasColumnType("jsonb")
            .HasColumnName("files_changed");
    }
}
