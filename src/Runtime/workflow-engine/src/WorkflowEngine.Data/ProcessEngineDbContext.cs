using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Entities;

namespace WorkflowEngine.Data;

internal sealed class ProcessEngineDbContext : DbContext
{
    public ProcessEngineDbContext(DbContextOptions<ProcessEngineDbContext> options)
        : base(options) { }

    public DbSet<ProcessEngineJobEntity> Jobs { get; set; }
    public DbSet<ProcessEngineTaskEntity> Tasks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Workflow entity
        modelBuilder.Entity<ProcessEngineJobEntity>(entity =>
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
        modelBuilder.Entity<ProcessEngineTaskEntity>(entity =>
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
