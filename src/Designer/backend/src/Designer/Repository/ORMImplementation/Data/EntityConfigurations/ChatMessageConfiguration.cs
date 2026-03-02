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

        builder
            .HasOne<ChatThreadDbModel>()
            .WithMany()
            .HasForeignKey(e => e.ThreadId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => e.ThreadId, "idx_chat_messages_thread_id");

        builder.Property(e => e.Id).HasColumnType("uuid").HasColumnName("id").IsRequired();

        builder.Property(e => e.ThreadId).HasColumnType("uuid").HasColumnName("thread_id").IsRequired();

        builder.Property(e => e.CreatedAt).HasColumnType("timestamptz").HasColumnName("created_at").IsRequired();

        builder.Property(e => e.Role).HasColumnType("integer").HasColumnName("role").IsRequired();

        builder.Property(e => e.Content).HasColumnType("character varying").HasColumnName("content").IsRequired();

        builder.Property(e => e.ActionMode).HasColumnType("integer").HasColumnName("action_mode");

        builder.Property(e => e.FilesChanged).HasColumnType("jsonb").HasColumnName("files_changed");

        builder.Property(e => e.AttachmentFileNames).HasColumnType("jsonb").HasColumnName("attachment_file_names");
    }
}
