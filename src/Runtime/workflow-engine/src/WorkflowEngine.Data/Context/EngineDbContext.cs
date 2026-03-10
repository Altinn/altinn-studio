using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using WorkflowEngine.Data.Entities;

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
            entity.HasIndex(e => new
            {
                e.InstanceOrg,
                e.InstanceApp,
                e.InstanceGuid,
            });
            entity.HasIndex(e => new { e.InstanceGuid, e.Status });

            entity
                .HasIndex(e => new { e.BackoffUntil, e.CreatedAt })
                .HasFilter("\"Status\" IN (0, 2)")
                .HasNullSortOrder(NullSortOrder.NullsFirst, NullSortOrder.NullsLast);

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

        // Configure idempotency key entity
        modelBuilder.Entity<IdempotencyKeyEntity>(entity =>
        {
            entity.ToTable("idempotency_keys");

            entity.HasKey(e => new { e.IdempotencyKey, e.InstanceGuid });

            entity.Property(e => e.IdempotencyKey).HasColumnName("idempotency_key");
            entity.Property(e => e.InstanceGuid).HasColumnName("instance_guid");
            entity.Property(e => e.RequestBodyHash).HasColumnName("request_body_hash").HasColumnType("bytea");
            entity.Property(e => e.WorkflowIds).HasColumnName("workflow_ids").HasColumnType("uuid[]");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone");
        });
    }
}
