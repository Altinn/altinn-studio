using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mime;
using System.Net.Sockets;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Utils;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Images;
using DotNet.Testcontainers.Networks;
using Microsoft.EntityFrameworkCore;
using Polly;
using Polly.Retry;
using Testcontainers.PostgreSql;
using Xunit;

namespace Designer.Tests.Fixtures
{
    [ExcludeFromCodeCoverage]
    public class StudioOidcGiteaFixture : IAsyncLifetime
    {
        private INetwork _giteaNetwork;

        private PostgreSqlContainer _postgreSqlContainer;

        private DesignerdbContext _dbContext;

        private IContainer _giteaContainer;

        private IContainer _fakeAnsattportenContainer;

        private Lazy<HttpClient> _giteaClient;
        public Lazy<HttpClient> GiteaClient
        {
            get =>
                _giteaClient ??= new Lazy<HttpClient>(() =>
                    new HttpClient()
                    {
                        BaseAddress = new Uri(GiteaUrl + "/api/v1/"),
                        DefaultRequestHeaders =
                        {
                            Authorization = new AuthenticationHeaderValue(
                                "Basic",
                                Convert.ToBase64String(
                                    Encoding.ASCII.GetBytes(
                                        $"{GiteaConstants.AdminUser}:{GiteaConstants.AdminPassword}"
                                    )
                                )
                            ),
                        },
                    }
                );
        }

        public int GiteaPort { get; } = TestUrlsProvider.GetRandomAvailablePort();
        public int DesignerPort { get; } = TestUrlsProvider.GetRandomAvailablePort();
        public int FakeAnsattportenPort { get; } = TestUrlsProvider.GetRandomAvailablePort();

        public string GiteaUrl => $"http://localhost:{GiteaPort}";
        public string DesignerUrl => $"http://localhost:{DesignerPort}";
        public string FakeAnsattportenUrl => $"http://localhost:{FakeAnsattportenPort}";

        public string DbConnectionString => _postgreSqlContainer?.GetConnectionString();

        public const string TestUserPid = "09858398468";
        public const string PidHashSalt = "test-salt";

        private static AsyncRetryPolicy GiteaClientRetryPolicy =>
            Policy
                .Handle<HttpRequestException>()
                .Or<SocketException>()
                .WaitAndRetryAsync(4, retryAttempt => TimeSpan.FromSeconds(retryAttempt));

        private async Task BuildAndCreateGiteaNetworkAsync()
        {
            _giteaNetwork = new NetworkBuilder().WithName(Guid.NewGuid().ToString("D")).Build();
            await _giteaNetwork.CreateAsync();
        }

        private async Task BuildAndStartPostgreSqlContainerAsync()
        {
            var containerBuilder = new PostgreSqlBuilder("postgres:16");
            _postgreSqlContainer = containerBuilder
                .WithNetwork(_giteaNetwork)
                .WithNetworkAliases("db")
                .WithImagePullPolicy(PullPolicy.Missing)
                .WithUsername(TestDbConstants.AdminUser)
                .WithPassword(TestDbConstants.AdminPassword)
                .WithDatabase(TestDbConstants.Database)
                .WithExposedPort(TestUrlsProvider.GetRandomAvailablePort())
                .Build();
            await _postgreSqlContainer.StartAsync();

            var dbContextOptions = new DbContextOptionsBuilder<DesignerdbContext>()
                .UseNpgsql(_postgreSqlContainer.GetConnectionString())
                .Options;
            _dbContext = new DesignerdbContext(dbContextOptions);
            await _dbContext.Database.ExecuteSqlRawAsync(
                $"CREATE ROLE {TestDbConstants.NonAdminUser} WITH LOGIN PASSWORD '{TestDbConstants.NonAdminPassword}'"
            );
            await _dbContext.Database.MigrateAsync();
        }

        public async Task InitializeAsync()
        {
            await BuildAndCreateGiteaNetworkAsync();
            await BuildAndStartPostgreSqlContainerAsync();
            await BuildAndStartFakeAnsattportenAsync();
            await BuildAndStartAltinnGiteaAsync();
            await ConfigureGitea();
            await SeedUserAccountMapping();
        }

        public async Task DisposeAsync()
        {
            _dbContext?.Dispose();
            if (_fakeAnsattportenContainer != null)
                await _fakeAnsattportenContainer.DisposeAsync();
            if (_giteaContainer != null)
                await _giteaContainer.DisposeAsync();
            if (_postgreSqlContainer != null)
                await _postgreSqlContainer.DisposeAsync();
            if (_giteaNetwork != null)
                await _giteaNetwork.DeleteAsync();
            if (GiteaClient.IsValueCreated)
            {
                GiteaClient.Value.Dispose();
            }
        }

        private async Task BuildAndStartFakeAnsattportenAsync()
        {
            string fakeAnsattportenDockerFilePath = Path.Join(
                CommonDirectoryPath.GetSolutionDirectory().DirectoryPath,
                "..",
                "development",
                "fake-ansattporten"
            );

            const string FakeAnsattportenImageName = "fake-ansattporten:latest";

            if (
                !CommandExecutor.TryExecute(
                    $"docker build --no-cache -t {FakeAnsattportenImageName} {fakeAnsattportenDockerFilePath}",
                    out string _,
                    out string fakeAnsattportenError
                )
            )
            {
                throw new Exception($"Failed to build fake-ansattporten image. Error: {fakeAnsattportenError}");
            }

            _fakeAnsattportenContainer = new ContainerBuilder(FakeAnsattportenImageName)
                .WithImagePullPolicy(PullPolicy.Never)
                .WithName($"fake-ansattporten-{Guid.NewGuid():N}")
                .WithPortBinding(FakeAnsattportenPort, 8443)
                .WithEnvironment(
                    new Dictionary<string, string>
                    {
                        { "ISSUER", FakeAnsattportenUrl },
                        { "BROWSER_BASE_URL", FakeAnsattportenUrl },
                    }
                )
                .Build();
            await _fakeAnsattportenContainer.StartAsync();
        }

        private async Task BuildAndStartAltinnGiteaAsync()
        {
            string giteaDockerFilePath = Path.Join(
                CommonDirectoryPath.GetSolutionDirectory().DirectoryPath,
                "..",
                "..",
                "gitea"
            );

            const string GiteaTestImageName = "repositories:latest";

            if (
                !CommandExecutor.TryExecute(
                    $"docker build --no-cache -t {GiteaTestImageName} {giteaDockerFilePath}",
                    out string _,
                    out string error
                )
            )
            {
                throw new Exception($"Failed to build gitea image. Error: {error}");
            }

            _giteaContainer = new ContainerBuilder(GiteaTestImageName)
                .WithImagePullPolicy(PullPolicy.Never)
                .WithNetwork(_giteaNetwork)
                .WithName($"gitea-studio-oidc-{Guid.NewGuid():N}")
                .WithPortBinding(GiteaPort, 3000)
                .WithPortBinding(22, true)
                .WithEnvironment(
                    new Dictionary<string, string>
                    {
                        { "GITEA____RUN_MODE", "prod" },
                        { "GITEA__database__DB_TYPE", "postgres" },
                        { "GITEA__database__HOST", "db:5432" },
                        { "GITEA__database__NAME", TestDbConstants.Database },
                        { "GITEA__database__USER", TestDbConstants.AdminUser },
                        { "GITEA__database__PASSWD", TestDbConstants.AdminPassword },
                        { "GITEA__server__ROOT_URL", GiteaUrl },
                        { "GITEA__service__ENABLE_REVERSE_PROXY_AUTHENTICATION", "true" },
                        { "GITEA__service__ENABLE_REVERSE_PROXY_AUTO_REGISTRATION", "true" },
                        { "GITEA__service__ENABLE_REVERSE_PROXY_FULL_NAME", "true" },
                        { "GITEA__service__ENABLE_REVERSE_PROXY_AUTHENTICATION_API", "true" },
                        { "GITEA__server__REVERSE_PROXY_AUTHENTICATION_USER", "X-WEBAUTH-USER" },
                        { "GITEA__server__REVERSE_PROXY_TRUSTED_PROXIES", "*" },
                        { "USER_GID", "1000" },
                        { "USER_UID", "1000" },
                    }
                )
                .Build();
            await _giteaContainer.StartAsync();
        }

        private async Task ConfigureGitea()
        {
            await CreateGiteaUsers();
            await CreateTestOrg();
            await CreateTestOrg(
                GiteaConstants.SecondaryTestOrgUsername,
                GiteaConstants.SecondaryTestOrgName,
                GiteaConstants.SecondaryTestOrgDescription
            );
            await CreateTestOrgTeams();
            await CreateTestOrgTeams(GiteaConstants.SecondaryTestOrgUsername);
            await AddUserToTeams(
                GiteaConstants.TestOrgUsername,
                "Owners",
                "Deploy-TT02",
                "Devs",
                "Deploy-AT21",
                "Deploy-AT22",
                "Admin-TT02",
                "Admin-AT21",
                "Admin-AT22"
            );
            await AddUserToTeams(
                GiteaConstants.SecondaryTestOrgUsername,
                "Owners",
                "Deploy-TT02",
                "Devs",
                "Deploy-AT21",
                "Deploy-AT22",
                "Admin-TT02",
                "Admin-AT21",
                "Admin-AT22"
            );
        }

        private async Task CreateGiteaUsers()
        {
            var retryPolicy = Policy
                .HandleResult<ExecResult>(x => x.ExitCode != 0)
                .FallbackAsync(t => throw new Exception("Failed to execute command on gitea container"))
                .WrapAsync(
                    Policy
                        .HandleResult<ExecResult>(x => x.ExitCode != 0)
                        .WaitAndRetryAsync(4, retryAttempt => TimeSpan.FromSeconds(retryAttempt))
                );

            await retryPolicy.ExecuteAsync(
                _ =>
                    _giteaContainer.ExecAsync(
                        new[]
                        {
                            "/bin/sh",
                            "-c",
                            $"gitea admin user create --username {GiteaConstants.AdminUser} --password {GiteaConstants.AdminPassword} --email {GiteaConstants.AdminEmail} --must-change-password=false --admin",
                        },
                        _
                    ),
                CancellationToken.None
            );

            await retryPolicy.ExecuteAsync(
                _ =>
                    _giteaContainer.ExecAsync(
                        new[]
                        {
                            "/bin/sh",
                            "-c",
                            $"gitea admin user create --username {GiteaConstants.TestUser} --password {GiteaConstants.TestUserPassword} --email {GiteaConstants.TestUserEmail} --must-change-password=false",
                        },
                        _
                    ),
                CancellationToken.None
            );
        }

        private async Task CreateTestOrg(
            string orgUserName = GiteaConstants.TestOrgUsername,
            string orgName = GiteaConstants.TestOrgName,
            string orgDescription = GiteaConstants.TestOrgDescription
        )
        {
            string body =
                @$"{{
                    ""username"": ""{orgUserName}"",
                    ""full_name"": ""{orgName}"",
                    ""description"": ""{orgDescription}""
                }}";

            using var content = new StringContent(body, Encoding.UTF8, MediaTypeNames.Application.Json);

            await GiteaClientRetryPolicy.ExecuteAsync(
                async _ => await GiteaClient.Value.PostAsync("orgs", content, _),
                CancellationToken.None
            );
        }

        private async Task CreateTestOrgTeams(string org = GiteaConstants.TestOrgUsername)
        {
            string teamsJsonFile = Path.Join(
                CommonDirectoryPath.GetSolutionDirectory().DirectoryPath,
                "..",
                "development",
                "data",
                "gitea-teams.json"
            );
            string teamsContent = await File.ReadAllTextAsync(teamsJsonFile);
            JsonNode teams = JsonNode.Parse(teamsContent);
            foreach (var team in teams as JsonArray)
            {
                team["units"] = JsonNode.Parse(@"[""repo.code"", ""repo.issues"", ""repo.pulls"", ""repo.releases""]");
                using var content = new StringContent(team.ToString(), Encoding.UTF8, MediaTypeNames.Application.Json);
                await GiteaClientRetryPolicy.ExecuteAsync(
                    async _ => await GiteaClient.Value.PostAsync($"orgs/{org}/teams", content, _),
                    CancellationToken.None
                );
            }
        }

        private async Task AddUserToTeams(string org, params string[] teams)
        {
            var allTeams = await GiteaClient.Value.GetAsync($"orgs/{org}/teams");
            string allTeamsContent = await allTeams.Content.ReadAsStringAsync();
            JsonArray teamsJson = JsonNode.Parse(allTeamsContent) as JsonArray;
            var teamIds = teamsJson
                .Where(x => teams.Contains(x["name"].GetValue<string>()))
                .Select(x => x["id"].GetValue<long>());
            foreach (long teamId in teamIds)
            {
                await GiteaClientRetryPolicy.ExecuteAsync(
                    async _ =>
                        await GiteaClient.Value.PutAsync($"teams/{teamId}/members/{GiteaConstants.TestUser}", null, _),
                    CancellationToken.None
                );
            }
        }

        private async Task SeedUserAccountMapping()
        {
            PidHash pidHash = PidHash.FromPid(TestUserPid, PidHashSalt);
            _dbContext.UserAccounts.Add(
                new UserAccountDbModel
                {
                    PidHash = pidHash.Value,
                    Username = GiteaConstants.TestUser,
                    Created = DateTimeOffset.UtcNow,
                }
            );
            await _dbContext.SaveChangesAsync();
        }
    }
}
