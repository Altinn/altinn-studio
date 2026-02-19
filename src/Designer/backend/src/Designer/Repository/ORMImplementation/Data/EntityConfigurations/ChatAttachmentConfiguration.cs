#nullable disable
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;

public class ChatAttachmentConfiguration : IEntityTypeConfiguration<ChatAttachmentDbModel>
{
    public void Configure(EntityTypeBuilder<ChatAttachmentDbModel> builder)
    {
        builder.ToTable("chat_attachments", "designer");

        builder.HasKey(e => e.Id);

        builder.HasOne<ChatMessageDbModel>()
            .WithMany()
            .HasForeignKey(e => e.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => e.MessageId, "idx_chat_attachments_message_id");

        builder.Property(e => e.Id)
            .HasColumnType("BIGSERIAL")
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        builder.Property(e => e.MessageId)
            .HasColumnType("bigint")
            .HasColumnName("message_id");

        builder.Property(e => e.FileName)
            .HasColumnType("character varying")
            .HasColumnName("file_name");

        builder.Property(e => e.CreatedAt)
            .HasColumnType("timestamptz")
            .HasColumnName("created_at");

        builder.Property(e => e.MimeType)
            .HasColumnType("character varying")
            .HasColumnName("mime_type");

        builder.Property(e => e.SizeBytes)
            .HasColumnType("bigint")
            .HasColumnName("size_bytes");

        builder.Property(e => e.BlobStorageKey)
            .HasColumnType("character varying")
            .HasColumnName("blob_storage_key");
    }
}
