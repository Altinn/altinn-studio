using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Context;

internal sealed class EngineDbContext : DbContext
{
    public EngineDbContext(DbContextOptions<EngineDbContext> options)
        : base(options) { }

    public DbSet<WorkflowEntity> Workflows { get; set; }
    public DbSet<StepEntity> Steps { get; set; }
    public DbSet<IdempotencyKeyEntity> IdempotencyKeys { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Workflow entity
        modelBuilder.Entity<WorkflowEntity>(entity =>
        {
            // Indexes
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.CorrelationId);
            entity.HasIndex(e => new { e.Namespace, e.Status });

            entity
                .HasIndex(e => new { e.BackoffUntil, e.CreatedAt })
                .HasFilter(
                    $"\"Status\" IN ({(int)PersistentItemStatus.Enqueued}, {(int)PersistentItemStatus.Requeued})"
                )
                .HasNullSortOrder(NullSortOrder.NullsFirst, NullSortOrder.NullsLast);

            // Dictionary<string,string> ↔ jsonb: EF/Npgsql handles this for normal queries,
            // but our SqlBulkInserter uses COPY BINARY which needs an explicit value converter.
            entity
                .Property(e => e.Labels)
                .HasConversion(
                    new ValueConverter<Dictionary<string, string>, string>(
                        v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                        v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, JsonSerializerOptions.Default)!
                    )
                );

            // GIN index on Labels for flexible filtering
            entity.HasIndex(e => e.Labels).HasMethod("gin");

            // Self-referencing many-to-many: a workflow can depend on many other workflows
            entity
                .HasMany(e => e.Dependencies)
                .WithMany()
                .UsingEntity(
                    "WorkflowDependency",
                    l => l.HasOne(typeof(WorkflowEntity)).WithMany().HasForeignKey("DependsOnWorkflowId"),
                    r => r.HasOne(typeof(WorkflowEntity)).WithMany().HasForeignKey("WorkflowId"),
                    j =>
                    {
                        j.HasKey("WorkflowId", "DependsOnWorkflowId");
                        j.HasIndex("DependsOnWorkflowId");
                    }
                );

            // Self-referencing many-to-many: optional links to related workflows
            entity
                .HasMany(e => e.Links)
                .WithMany()
                .UsingEntity(
                    "WorkflowLink",
                    l => l.HasOne(typeof(WorkflowEntity)).WithMany().HasForeignKey("LinkedWorkflowId"),
                    r => r.HasOne(typeof(WorkflowEntity)).WithMany().HasForeignKey("WorkflowId"),
                    j =>
                    {
                        j.HasKey("WorkflowId", "LinkedWorkflowId");
                        j.HasIndex("LinkedWorkflowId");
                    }
                );
        });

        // Configure Step entity
        modelBuilder.Entity<StepEntity>(entity =>
        {
            entity.HasIndex(e => new { e.JobId, e.Status });
        });

        // Configure IdempotencyKey entity
        modelBuilder.Entity<IdempotencyKeyEntity>(entity =>
        {
            entity.HasKey(e => new { e.IdempotencyKey, e.Namespace });
        });
    }
}
