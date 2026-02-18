using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Entities;

namespace WorkflowEngine.Data.Context;

internal sealed class EngineDbContext : DbContext
{
    public EngineDbContext(DbContextOptions<EngineDbContext> options)
        : base(options) { }

    public DbSet<WorkflowEntity> Workflows { get; set; }
    public DbSet<StepEntity> Steps { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Workflow entity
        modelBuilder.Entity<WorkflowEntity>(entity =>
        {
            // Indexes
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.IdempotencyKey);
            entity.HasIndex(e => new
            {
                e.InstanceOrg,
                e.InstanceApp,
                e.InstanceGuid,
            });

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
        });

        // Configure Step entity
        modelBuilder.Entity<StepEntity>(entity =>
        {
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.BackoffUntil);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.ProcessingOrder);
            entity.HasIndex(e => e.IdempotencyKey);
        });
    }
}
