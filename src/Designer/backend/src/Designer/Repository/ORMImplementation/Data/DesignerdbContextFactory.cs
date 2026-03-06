#nullable enable
using System;
using System.IO;
using Altinn.Studio.Designer.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Data;

public class DesignerdbContextFactory : IDesignTimeDbContextFactory<DesignerdbContext>
{
    public DesignerdbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        var projectDirectory = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));

        var configuration = new ConfigurationBuilder()
            .SetBasePath(projectDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var postgresSettings =
            configuration.GetSection(nameof(PostgreSQLSettings)).Get<PostgreSQLSettings>()
            ?? throw new InvalidOperationException("Missing PostgreSQLSettings configuration.");

        var optionsBuilder = new DbContextOptionsBuilder<DesignerdbContext>();
        optionsBuilder.UseNpgsql(postgresSettings.FormattedConnectionString());
        return new DesignerdbContext(optionsBuilder.Options);
    }
}
