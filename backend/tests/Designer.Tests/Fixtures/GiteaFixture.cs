using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Mime;
using System.Net.Sockets;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;
using Designer.Tests.Utils;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Images;
using DotNet.Testcontainers.Networks;
using Polly;
using Polly.Retry;
using Testcontainers.PostgreSql;
using Xunit;

namespace Designer.Tests.Fixtures
{
    [ExcludeFromCodeCoverage]
    public class GiteaFixture : IAsyncLifetime
    {
        private INetwork _giteaNetwork;

        private PostgreSqlContainer _postgreSqlContainer;

        private IContainer _giteaContainer;

        private Lazy<HttpClient> _giteaClient;
        public Lazy<HttpClient> GiteaClient
        {
            get => _giteaClient ??= new Lazy<HttpClient>(() => new HttpClient(new EnsureSuccessHandler()
            {
                InnerHandler = new HttpClientHandler(),
            })
            {
                BaseAddress = new Uri(TestUrlsProvider.Instance.GiteaUrl + "/api/v1/"),
                DefaultRequestHeaders = { Authorization = new BasicAuthenticationHeaderValue(GiteaConstants.AdminUser, GiteaConstants.AdminPassword) }
            });
        }

        public string OAuthApplicationClientId { get; private set; }
        public string OAuthApplicationClientSecret { get; private set; }

        public string DbConnectionString => _postgreSqlContainer?.GetConnectionString();

        private static AsyncRetryPolicy GiteaClientRetryPolicy => Policy.Handle<HttpRequestException>()
            .Or<SocketException>()
            .WaitAndRetryAsync(4, retryAttempt => TimeSpan.FromSeconds(retryAttempt));

        private async Task BuildAndCreateGiteaNetworkAsync()
        {
            _giteaNetwork = new NetworkBuilder()
                .WithName(Guid.NewGuid().ToString("D"))
                .Build();
            await _giteaNetwork.CreateAsync();
        }

        private async Task BuildAndStartPostgreSqlContainerAsync()
        {
            _postgreSqlContainer = TestDbProvider.Instance.CreatePostgresContainer(_giteaNetwork);
            await _postgreSqlContainer.StartAsync();
            await TestDbProvider.Instance.MigrateAsync();
        }

        public async Task InitializeAsync()
        {
            await BuildAndCreateGiteaNetworkAsync();
            await BuildAndStartPostgreSqlContainerAsync();
            await BuildAndStartAltinnGiteaAsync();
            await ConfigureGitea();
        }

        public async Task DisposeAsync()
        {
            await _postgreSqlContainer.DisposeAsync();
            await _giteaContainer.DisposeAsync();
            await _giteaNetwork.DeleteAsync();
            if (GiteaClient.IsValueCreated)
            {
                GiteaClient.Value.Dispose();
            }
        }

        private async Task BuildAndStartAltinnGiteaAsync()
        {
            string giteaDockerFilePath = Path.Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "src", "gitea");

            const string GiteaTestImageName = "repositories:latest";

            if (!CommandExecutor.TryExecute($"docker build --no-cache -t {GiteaTestImageName} {giteaDockerFilePath}", out string _, out string error))
            {
                throw new Exception($"Failed to build gitea image. Error: {error}");
            }

            _giteaContainer = new ContainerBuilder().WithImage(GiteaTestImageName)
                .WithImagePullPolicy(PullPolicy.Never)
                .WithNetwork(_giteaNetwork)
                .WithName("gitea")
                .WithPortBinding(TestUrlsProvider.Instance.GiteaPort, 3000)
                .WithPortBinding(22, true)
                .WithEnvironment(new Dictionary<string, string>
                {
                    {"GITEA____RUN_MODE", "prod"},
                    {"GITEA__database__DB_TYPE", "postgres"},
                    {"GITEA__database__HOST", "db:5432"},
                    {"GITEA__database__NAME", TestDbConstants.Database},
                    {"GITEA__database__USER", TestDbConstants.AdminUser},
                    {"GITEA__database__PASSWD", TestDbConstants.AdminPassword},
                    {"GITEA__server__ROOT_URL", $"{TestUrlsProvider.Instance.GiteaUrl}"},
                    {"USER_GID", "1000"},
                    {"USER_UID", "1000"}
                })
                .Build();
            await _giteaContainer.StartAsync();

        }

        private async Task ConfigureGitea()
        {
            await CreateGiteaUsers();
            await CreateTestOrg();
            await CreateTestOrg(GiteaConstants.SecondaryTestOrgUsername, GiteaConstants.SecondaryTestOrgName, GiteaConstants.SecondaryTestOrgDescription);
            await CreateTestOrgTeams();
            await CreateTestOrgTeams(GiteaConstants.SecondaryTestOrgUsername);
            await AddUserToTeams(GiteaConstants.TestOrgUsername, "Owners", "Deploy-TT02", "Devs", "Deploy-AT21", "Deploy-AT22");
            await AddUserToTeams(GiteaConstants.SecondaryTestOrgUsername, "Owners", "Deploy-TT02", "Devs", "Deploy-AT21", "Deploy-AT22");
            await GenerateApplicationClientIdAndClientSecretInGitea();
        }

        private async Task CreateGiteaUsers()
        {
            var retryPolicy = Policy.HandleResult<ExecResult>(x => x.ExitCode != 0)
                .FallbackAsync(t => throw new Exception("Failed to execute command on gitea container"))
                .WrapAsync(
                    Policy.HandleResult<ExecResult>(x => x.ExitCode != 0)
                        .WaitAndRetryAsync(4, retryAttempt => TimeSpan.FromSeconds(retryAttempt))
                );

            await retryPolicy.ExecuteAsync(_ => _giteaContainer.ExecAsync(new[]
            {
                "/bin/sh", "-c", $"gitea admin user create --username {GiteaConstants.AdminUser} --password {GiteaConstants.AdminPassword} --email {GiteaConstants.AdminEmail} --must-change-password=false --admin"
            }, _), CancellationToken.None);

            await retryPolicy.ExecuteAsync(_ => _giteaContainer.ExecAsync(new[]
            {
                "/bin/sh", "-c", $"gitea admin user create --username {GiteaConstants.TestUser} --password {GiteaConstants.TestUserPassword} --email {GiteaConstants.TestUserEmail} --must-change-password=false"
            }, _), CancellationToken.None);
        }

        private async Task CreateTestOrg(string orgUserName = GiteaConstants.TestOrgUsername, string orgName = GiteaConstants.TestOrgName, string orgDescription = GiteaConstants.TestOrgDescription)
        {
            string body = @$"{{
                    ""username"": ""{orgUserName}"",
                    ""full_name"": ""{orgName}"",
                    ""description"": ""{orgDescription}""
                }}";

            using var content = new StringContent(body, Encoding.UTF8, MediaTypeNames.Application.Json);

            await GiteaClientRetryPolicy.ExecuteAsync(async _ => await GiteaClient.Value.PostAsync("orgs", content, _), CancellationToken.None);
        }

        private async Task CreateTestOrgTeams(string org = GiteaConstants.TestOrgUsername)
        {
            string teamsJsonFile = Path.Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "development", "data", "gitea-teams.json");
            string teamsContent = await File.ReadAllTextAsync(teamsJsonFile);
            JsonNode teams = JsonNode.Parse(teamsContent);
            foreach (var team in teams as JsonArray)
            {
                team["units"] = JsonNode.Parse(@"[""repo.code"", ""repo.issues"", ""repo.pulls"", ""repo.releases""]");
                using var content = new StringContent(team.ToString(), Encoding.UTF8, MediaTypeNames.Application.Json);
                await GiteaClientRetryPolicy.ExecuteAsync(async _ => await GiteaClient.Value.PostAsync($"orgs/{org}/teams", content, _), CancellationToken.None);
            }
        }

        private async Task AddUserToTeams(string org, params string[] teams)
        {
            var allTeams = await GiteaClient.Value.GetAsync($"orgs/{org}/teams");
            string allTeamsContent = await allTeams.Content.ReadAsStringAsync();
            JsonArray teamsJson = JsonNode.Parse(allTeamsContent) as JsonArray;
            var teamIds = teamsJson.Where(x => teams.Contains(x["name"].GetValue<string>())).Select(x => x["id"].GetValue<long>());
            foreach (long teamId in teamIds)
            {
                await GiteaClientRetryPolicy.ExecuteAsync(async _ => await GiteaClient.Value.PutAsync($"teams/{teamId}/members/{GiteaConstants.TestUser}", null, _), CancellationToken.None);
            }
        }

        private async Task GenerateApplicationClientIdAndClientSecretInGitea()
        {
            using var applicationContent =
                new StringContent(
                    $@"{{""name"":""altinn-studio"",""redirect_uris"":[""{TestUrlsProvider.Instance.DesignerUrl}/signin-oidc""],""trusted"":true}}",
                    Encoding.UTF8, MediaTypeNames.Application.Json);

            using HttpResponseMessage addApplicationResponse = await GiteaClientRetryPolicy.ExecuteAsync(async _ => await GiteaClient.Value.PostAsync("user/applications/oauth2", applicationContent, _), CancellationToken.None);
            addApplicationResponse.EnsureSuccessStatusCode();

            string addApplicationResponseContent = await addApplicationResponse.Content.ReadAsStringAsync();
            JsonNode addApplicationResponseJson = JsonNode.Parse(addApplicationResponseContent);
            OAuthApplicationClientId = addApplicationResponseJson["client_id"].GetValue<string>();
            OAuthApplicationClientSecret = addApplicationResponseJson["client_secret"].GetValue<string>();
        }
    }

}
