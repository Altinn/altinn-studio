using Altinn.Studio.Designer.Repository.ORMImplementation.Data.EntityConfigurations;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data;

public class DesignerdbContext : DbContext
{
    public DesignerdbContext(DbContextOptions<DesignerdbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<DeploymentDbModel> Deployments { get; set; }
    public virtual DbSet<ReleaseDbModel> Releases { get; set; }
    public virtual DbSet<AppScopesDbModel> AppScopes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.UseSerialColumns();
        modelBuilder.ApplyConfiguration(new BuildConfiguration());
        modelBuilder.ApplyConfiguration(new DeploymentConfiguration());
        modelBuilder.ApplyConfiguration(new ReleaseConfiguration());
        modelBuilder.ApplyConfiguration(new AppScopesConfiguration());
        base.OnModelCreating(modelBuilder);
    }
}
