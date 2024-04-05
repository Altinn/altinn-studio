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

    public virtual DbSet<Deployment> Deployments { get; set; }

    public virtual DbSet<Release> Releases { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new DeploymentConfiguration());
        modelBuilder.ApplyConfiguration(new ReleaseConfiguration());
        base.OnModelCreating(modelBuilder);
    }


}
