using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Networks;
using Polly;
using Testcontainers.PostgreSql;
using Xunit;
using static System.IO.Path;

namespace Designer.Tests.Fixtures
{
    public class GiteaFixture : IAsyncLifetime
    {
        private INetwork _giteaNetwork;

        public PostgreSqlContainer _postgreSqlContainer;

        public IContainer _giteaContainer;

        private async Task BuildAndCreateGiteaNetworkAsync()
        {
            _giteaNetwork = new NetworkBuilder()
                .WithName(Guid.NewGuid().ToString("D"))
                .Build();
            await _giteaNetwork.CreateAsync();
        }

        private async Task BuildAndStartPostgreSqlContainerAsync()
        {
            _postgreSqlContainer = new PostgreSqlBuilder()
                .WithNetwork(_giteaNetwork)
                .WithNetworkAliases("db")
                .WithUsername("gitea")
                .WithPassword("gitea")
                .WithDatabase("gitea")
                .Build();
            await _postgreSqlContainer.StartAsync();
        }

        public async Task InitializeAsync()
        {
            await BuildAndCreateGiteaNetworkAsync();
            await BuildAndStartPostgreSqlContainerAsync();
            await BuildAndStartAltinnGiteaAsync();
        }
        public async Task DisposeAsync()
        {
            await _postgreSqlContainer.DisposeAsync();
            await _giteaContainer.DisposeAsync();
            await _giteaNetwork.DeleteAsync();
        }



        private async Task BuildAndStartAltinnGiteaAsync()
        {
            string giteaDockerFilePath = Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "gitea");
            var altinnGiteaImage = new ImageFromDockerfileBuilder()
                .WithDockerfileDirectory(giteaDockerFilePath)
                .WithDockerfile("Dockerfile")
                .WithName("repositories:latest")
                .Build();

            await altinnGiteaImage.CreateAsync();

            _giteaContainer = new ContainerBuilder().WithImage("repositories:latest")
                .WithNetwork(_giteaNetwork)
                .WithPortBinding(3000, 3000)
                .WithPortBinding(222, 22)
                .WithEnvironment(new Dictionary<string, string>
                {
                    {"GITEA____RUN_MODE", "prod"},
                    {"GITEA__database__DB_TYPE", "postgres"},
                    {"GITEA__database__HOST", "db:5432"},
                    {"GITEA__database__NAME", "gitea"},
                    {"GITEA__database__USER", "gitea"},
                    {"GITEA__database__PASSWD", "gitea"},
                    {"USER_GID", "1000"},
                    {"USER_UID", "1000"}
                })
                .Build();
            await _giteaContainer.StartAsync();

            // Make sure that gitea is up and running before we try to create the admin user
            var policy = Policy.HandleResult<ExecResult>(x => x.ExitCode != 0)
                .WaitAndRetryAsync(10, retryAttempt => TimeSpan.FromSeconds(1));

            await policy.ExecuteAsync(_ =>
            {
                return _giteaContainer.ExecAsync(new[]
                {
                    "/bin/sh", "-c", "gitea admin user create --username testadmin --password TestAdmin1234$ --email testadmin@digdir.no --must-change-password=false"
                }, _);

            }, CancellationToken.None);

        }
    }

}
