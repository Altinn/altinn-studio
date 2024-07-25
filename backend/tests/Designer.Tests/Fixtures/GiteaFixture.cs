using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Net.Sockets;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Images;
using DotNet.Testcontainers.Networks;
using Microsoft.Extensions.Configuration;
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


        private IContainer _loadBalancerContainer;

        private Lazy<HttpClient> _giteaClient;
        public Lazy<HttpClient> GiteaClient
        {
            get => _giteaClient ??= new Lazy<HttpClient>(() => new HttpClient(new EnsureSuccessHandler()
            {
                InnerHandler = new HttpClientHandler(),
            })
            {
                BaseAddress = new Uri(DirectGiteaUrl + "api/v1/"),
                DefaultRequestHeaders = { Authorization = new BasicAuthenticationHeaderValue(GiteaConstants.AdminUser, GiteaConstants.AdminPassword) }
            });
        }


        public int GiteaPort;

        public string GiteaUrl => $"http://studio.localhost/repos/";
        private string DirectGiteaUrl => $"http://localhost:{GiteaPort}/";

        public string OAuthApplicationClientId { get; private set; }
        public string OAuthApplicationClientSecret { get; private set; }

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
            _postgreSqlContainer = new PostgreSqlBuilder()
                .WithNetwork(_giteaNetwork)
                .WithImagePullPolicy(PullPolicy.Missing)
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
            await BuildAndStartLoadBalancerAsync();
            await ConfigureGitea();
        }

        public async Task DisposeAsync()
        {
            await _postgreSqlContainer.DisposeAsync();
            await _giteaContainer.DisposeAsync();
            await _loadBalancerContainer.DisposeAsync();
            await _giteaNetwork.DeleteAsync();
            if (GiteaClient.IsValueCreated)
            {
                GiteaClient.Value.Dispose();
            }
        }

        private async Task BuildAndStartAltinnGiteaAsync()
        {
            string giteaDockerFilePath = Path.Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "gitea");
            var altinnGiteaImage = new ImageFromDockerfileBuilder()
                .WithDockerfileDirectory(giteaDockerFilePath)
                .WithDockerfile("Dockerfile")
                .WithName("repositories:latest")
                .Build();

            await altinnGiteaImage.CreateAsync();

            GiteaPort = GetRandomAvailablePort();

            _giteaContainer = new ContainerBuilder().WithImage(altinnGiteaImage.FullName)
                .WithImagePullPolicy(PullPolicy.Never)
                .WithNetwork(_giteaNetwork)
                .WithName("gitea")
                .WithPortBinding(GiteaPort, 3000)
                .WithPortBinding(22, true)
                .WithEnvironment(new Dictionary<string, string>
                {
                    {"GITEA____RUN_MODE", "prod"},
                    {"GITEA__database__DB_TYPE", "postgres"},
                    {"GITEA__database__HOST", "db:5432"},
                    {"GITEA__database__NAME", "gitea"},
                    {"GITEA__database__USER", "gitea"},
                    {"GITEA__database__PASSWD", "gitea"},
                    {"GITEA__server__ROOT_URL", $"http://studio.localhost/repos"},
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

        private async Task BuildAndStartLoadBalancerAsync()
        {
            // Build and run nginx load balancer which will proxy /repo url to gitea container
            // and / to localhost:5000 but to the host localhost. Maybe host.docker.internal will needs to be resolved in the configuration.
            string loadBalancerDockerFilePath = Path.Combine(CommonDirectoryPath.GetProjectDirectory().DirectoryPath, "Fixtures", "GiteaFixture");
            var loadBalancerImage = new ImageFromDockerfileBuilder()
                .WithDockerfileDirectory(loadBalancerDockerFilePath)
                .WithDockerfile("Dockerfile")
                .WithName("loadbalancer:latest")
                .Build();

            await loadBalancerImage.CreateAsync();

            _loadBalancerContainer = new ContainerBuilder().WithImage(loadBalancerImage.FullName)
                .WithImagePullPolicy(PullPolicy.Never)
                .WithNetwork(_giteaNetwork)
                .WithName("loadbalancer")
                .WithPortBinding(80, 80)
                .WithEnvironment(new Dictionary<string, string>
                {
                    {"NGINX_HOST", "localhost"},
                    {"NGINX_PORT", "80"}
                })
                .WithExtraHost("host.docker.internal", "host-gateway")
                .Build();

            await _loadBalancerContainer.StartAsync();

        }

        private int GetRandomAvailablePort()
        {
            TcpListener listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            return port;
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
            var applicationContent =
                new StringContent(
                    @"{""name"":""altinn-studio"",""redirect_uris"":[""http://studio.localhost/signin-oidc""],""trusted"":true}",
                    Encoding.UTF8, MediaTypeNames.Application.Json);

            HttpResponseMessage addApplicationResponse = await GiteaClientRetryPolicy.ExecuteAsync(async _ => await GiteaClient.Value.PostAsync("user/applications/oauth2", applicationContent, _), CancellationToken.None);
            addApplicationResponse.EnsureSuccessStatusCode();

            string addApplicationResponseContent = await addApplicationResponse.Content.ReadAsStringAsync();
            JsonNode addApplicationResponseJson = JsonNode.Parse(addApplicationResponseContent);
            OAuthApplicationClientId = addApplicationResponseJson["client_id"].GetValue<string>();
            OAuthApplicationClientSecret = addApplicationResponseJson["client_secret"].GetValue<string>();
        }
    }

}
