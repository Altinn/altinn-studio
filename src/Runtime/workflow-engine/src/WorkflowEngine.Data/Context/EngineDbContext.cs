using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using WorkflowEngine.Data.Constants;
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

        modelBuilder.HasDefaultSchema(SchemaNames.Engine);

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

            entity.HasIndex(e => e.HeartbeatAt).HasFilter($"\"Status\" = {(int)PersistentItemStatus.Processing}");
            entity.HasIndex(e => e.Labels).HasMethod("gin");
            entity.Property(e => e.Labels).HasConversion(LabelsJsonb.Converter, LabelsJsonb.Comparer);

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
            entity.HasIndex(e => e.Labels).HasMethod("gin");
            entity.Property(e => e.Labels).HasConversion(LabelsJsonb.Converter, LabelsJsonb.Comparer);
        });

        // Configure IdempotencyKey entity
        modelBuilder.Entity<IdempotencyKeyEntity>(entity =>
        {
            entity.HasKey(e => new { e.IdempotencyKey, e.Namespace });
        });
    }

    /// <summary>
    /// EF Core value converter + comparer for <c>Dictionary&lt;string,string&gt;? ↔ jsonb</c>.
    /// The converter is needed because our <see cref="SqlBulkInserter"/> uses COPY BINARY
    /// (Npgsql handles jsonb natively for normal EF queries). The comparer enables correct
    /// change tracking and silences EF warning 10620.
    /// </summary>
    private static class LabelsJsonb
    {
        public static readonly ValueConverter<Dictionary<string, string>?, string> Converter = new(
            v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
            v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, JsonSerializerOptions.Default)
        );

        public static readonly ValueComparer<Dictionary<string, string>?> Comparer = new(
            equalsExpression: (a, b) => AreEqual(a, b),
            hashCodeExpression: v => GetHashCode(v),
            snapshotExpression: v => Snapshot(v)
        );

        private static bool AreEqual(Dictionary<string, string>? a, Dictionary<string, string>? b)
        {
            if (a is null)
                return b is null;
            if (b is null || a.Count != b.Count)
                return false;
            foreach (var (key, value) in a)
            {
                if (!b.TryGetValue(key, out var other) || value != other)
                    return false;
            }
            return true;
        }

        private static int GetHashCode(Dictionary<string, string>? labels)
        {
            if (labels is null)
                return 0;

            return labels.Aggregate(0, (hash, kv) => HashCode.Combine(hash, kv.Key, kv.Value));
        }

        private static Dictionary<string, string>? Snapshot(Dictionary<string, string>? labels)
        {
            return labels is null ? null : new Dictionary<string, string>(labels);
        }
    }
}
