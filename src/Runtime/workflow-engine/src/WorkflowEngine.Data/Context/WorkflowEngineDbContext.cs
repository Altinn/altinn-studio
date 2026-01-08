using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Entities;

namespace WorkflowEngine.Data.Context;

internal sealed class WorkflowEngineDbContext : DbContext
{
    public WorkflowEngineDbContext(DbContextOptions<WorkflowEngineDbContext> options)
        : base(options) { }

    public DbSet<WorkflowEntity> Jobs { get; set; }
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
            entity.HasIndex(e => e.Key);
            entity.HasIndex(e => new
            {
                e.InstanceOrg,
                e.InstanceApp,
                e.InstanceGuid,
            });

            // CreatedAt property
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();

            // UpdatedAt property
            entity.Property(e => e.UpdatedAt).ValueGeneratedOnAddOrUpdate();
        });

        // Configure Step entity
        modelBuilder.Entity<StepEntity>(entity =>
        {
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.BackoffUntil);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.ProcessingOrder);
            entity.HasIndex(e => e.Key);

            // CreatedAt property
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();

            // UpdatedAt property
            entity.Property(e => e.UpdatedAt).ValueGeneratedOnAddOrUpdate();
        });
    }
}
