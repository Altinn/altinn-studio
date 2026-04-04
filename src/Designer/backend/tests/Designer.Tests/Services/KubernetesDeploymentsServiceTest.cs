using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Services
{
    public class KubernetesDeploymentsServiceTest
    {
        private readonly Mock<IEnvironmentsService> _environementsService;
        private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient;

        public KubernetesDeploymentsServiceTest()
        {
            _environementsService = new Mock<IEnvironmentsService>();
            _environementsService
                .Setup(req => req.GetEnvironments())
                .ReturnsAsync(GetEnvironments("environments.json"));

            _runtimeGatewayClient = new Mock<IRuntimeGatewayClient>();
            _runtimeGatewayClient
                .Setup(req =>
                    req.GetKubernetesDeploymentsAsync(
                        "ttd",
                        It.IsAny<AltinnEnvironment>(),
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([new KubernetesDeployment { Release = "ttd-app", Version = "latest" }]);
        }

        [Theory]
        [InlineData("ttd", "issue-6094")]
        public async Task GetDeploymentAsync_OK(string org, string app)
        {
            // Arrange
            var environments = GetEnvironments("environments.json");
            _environementsService
                .Setup(e => e.GetOrganizationEnvironments(org, It.IsAny<CancellationToken>()))
                .ReturnsAsync(environments);
            var kubernetesDeployments = GetKubernetesDeployments("completedDeployments.json");
            foreach (EnvironmentModel environment in environments)
            {
                _runtimeGatewayClient
                    .Setup(req =>
                        req.GetKubernetesDeploymentsAsync(
                            org,
                            It.Is<AltinnEnvironment>(env => env.Name == environment.Name),
                            It.Is<string>(selector => selector == $"release={org}-{app}"),
                            It.IsAny<CancellationToken>()
                        )
                    )
                    .ReturnsAsync(
                        CreateDeploymentsResponse(kubernetesDeployments, environment.Name)
                            .Select(d =>
                            {
                                d.Release = $"{org}-{app}";
                                return d;
                            })
                    );
            }

            KubernetesDeploymentsService kubernetesDeploymentsService = new(
                _environementsService.Object,
                _runtimeGatewayClient.Object
            );

            // Act
            List<KubernetesDeployment> kubernetesDeploymentList = await kubernetesDeploymentsService.GetAsync(
                org,
                app,
                CancellationToken.None
            );

            // Assert
            Assert.Equal(2, kubernetesDeploymentList.Count);
            Assert.All(
                kubernetesDeploymentList,
                deployment =>
                {
                    Assert.Equal($"{org}-{app}", deployment.Release);
                    Assert.False(string.IsNullOrWhiteSpace(deployment.Version));
                }
            );
        }

        [Theory]
        [InlineData("ttd", "issue-6094")]
        public async Task GetDeploymentAsync_NotFoundFromGateway_IsIgnored(string org, string app)
        {
            // Arrange
            var environments = GetEnvironments("environments.json").Take(2).ToList();
            _environementsService
                .Setup(e => e.GetOrganizationEnvironments(org, It.IsAny<CancellationToken>()))
                .ReturnsAsync(environments);
            _runtimeGatewayClient
                .Setup(req =>
                    req.GetKubernetesDeploymentsAsync(
                        org,
                        It.Is<AltinnEnvironment>(env => env.Name == environments[0].Name),
                        It.Is<string>(selector => selector == $"release={org}-{app}"),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([new KubernetesDeployment { Release = $"{org}-{app}", Version = "123" }]);
            _runtimeGatewayClient
                .Setup(req =>
                    req.GetKubernetesDeploymentsAsync(
                        org,
                        It.Is<AltinnEnvironment>(env => env.Name == environments[1].Name),
                        It.Is<string>(selector => selector == $"release={org}-{app}"),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new HttpRequestException("Not found", null, HttpStatusCode.NotFound));

            KubernetesDeploymentsService kubernetesDeploymentsService = new(
                _environementsService.Object,
                _runtimeGatewayClient.Object
            );

            // Act
            List<KubernetesDeployment> kubernetesDeploymentList = await kubernetesDeploymentsService.GetAsync(
                org,
                app,
                CancellationToken.None
            );

            // Assert
            Assert.Single(kubernetesDeploymentList);
            Assert.Equal(environments[0].Name, kubernetesDeploymentList[0].EnvName);
        }

        private static List<EnvironmentModel> GetEnvironments(string filename)
        {
            string unitTestFolder = Path.GetDirectoryName(
                new Uri(typeof(DeploymentServiceTest).Assembly.Location).LocalPath
            );
            string path = Path.Combine(
                unitTestFolder,
                "..",
                "..",
                "..",
                "..",
                "..",
                "..",
                "development",
                "azure-devops-mock",
                filename
            );
            if (File.Exists(path))
            {
                string environments = File.ReadAllText(path);
                EnvironmentsModel environmentsList = System.Text.Json.JsonSerializer.Deserialize<EnvironmentsModel>(
                    environments
                );

                return environmentsList.Environments;
            }

            return null;
        }

        private static List<KubernetesDeployment> GetKubernetesDeployments(string filename)
        {
            string unitTestFolder = Path.GetDirectoryName(
                new Uri(typeof(DeploymentServiceTest).Assembly.Location).LocalPath
            );
            string path = Path.Combine(
                unitTestFolder,
                "..",
                "..",
                "..",
                "_TestData",
                "KubernetesDeployments",
                filename
            );
            if (!File.Exists(path))
            {
                return null;
            }

            string deployments = File.ReadAllText(path);
            return JsonConvert.DeserializeObject<List<KubernetesDeployment>>(deployments);
        }

        private static IEnumerable<KubernetesDeployment> CreateDeploymentsResponse(
            IEnumerable<KubernetesDeployment> deployments,
            string envName
        )
        {
            var deployment = deployments.FirstOrDefault(d => d.EnvName == envName);
            return deployment is null ? [] : [deployment];
        }
    }
}
