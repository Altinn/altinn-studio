using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Microsoft.Extensions.Logging;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Services
{
    public class KubernetesDeploymentsServiceTest
    {
        private readonly Mock<IEnvironmentsService> _environementsService;
        private readonly Mock<IKubernetesWrapperClient> _kubernetesWrapperClient;
        private readonly Mock<ILogger<DeploymentService>> _deploymentLogger;

        public KubernetesDeploymentsServiceTest()
        {
            _environementsService = new Mock<IEnvironmentsService>();
            _environementsService.Setup(req => req.GetEnvironments())
                .ReturnsAsync(GetEnvironments("environments.json"));

            _kubernetesWrapperClient = new Mock<IKubernetesWrapperClient>();
            _kubernetesWrapperClient.Setup(req => req.GetDeploymentAsync("ttd", It.IsAny<string>(), It.IsAny<EnvironmentModel>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new KubernetesDeployment());

            _deploymentLogger = new Mock<ILogger<DeploymentService>>();
        }

        [Theory]
        [InlineData("ttd", "issue-6094")]
        public async Task GetDeploymentAsync_OK(string org, string app)
        {
            // Arrange
            var environments = GetEnvironments("environments.json");
            _environementsService.Setup(e => e.GetOrganizationEnvironments(org)).ReturnsAsync(environments);
            var kubernetesDeployments = GetKubernetesDeployments("completedDeployments.json");
            foreach (EnvironmentModel environment in environments)
            {
                _kubernetesWrapperClient.Setup(req => req.GetDeploymentAsync(org, app, It.Is<EnvironmentModel>(env => env.Name == environment.Name), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(kubernetesDeployments.FirstOrDefault(deployment => deployment.EnvName == environment.Name) ?? new KubernetesDeployment { EnvName = environment.Name });
            }

            KubernetesDeploymentsService kubernetesDeploymentsService = new(
                _environementsService.Object,
                _kubernetesWrapperClient.Object,
                _deploymentLogger.Object);

            // Act
            List<KubernetesDeployment> kubernetesDeploymentList =
                await kubernetesDeploymentsService.GetAsync(org, app, CancellationToken.None);

            // Assert
            Assert.Equal(4, kubernetesDeploymentList.Count);
        }

        [Theory]
        [InlineData("ttd")]
        public async Task GetDeploymentsAsync_OK(string org)
        {
            // Arrange
            var environments = GetEnvironments("environments.json");
            _environementsService.Setup(e => e.GetOrganizationEnvironments(org)).ReturnsAsync(environments);
            var kubernetesDeployments = GetKubernetesDeployments("completedDeployments.json");
            foreach (EnvironmentModel environment in environments)
            {
                _kubernetesWrapperClient.Setup(req => req.GetDeploymentsAsync(org, It.Is<EnvironmentModel>(env => env.Name == environment.Name), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(kubernetesDeployments.Where(deployment => deployment.EnvName == environment.Name));
            }

            KubernetesDeploymentsService kubernetesDeploymentsService = new(
                _environementsService.Object,
                _kubernetesWrapperClient.Object,
                _deploymentLogger.Object);

            // Act
            Dictionary<string, List<KubernetesDeployment>> kubernetesDeploymentDict =
                await kubernetesDeploymentsService.GetAsync(org, CancellationToken.None);

            // Assert
            Assert.Single(kubernetesDeploymentDict["tt02"]);
            Assert.Single(kubernetesDeploymentDict["at22"]);
            Assert.Empty(kubernetesDeploymentDict["at21"]);
            Assert.Empty(kubernetesDeploymentDict["production"]);
        }

        private static List<EnvironmentModel> GetEnvironments(string filename)
        {
            string unitTestFolder =
                Path.GetDirectoryName(new Uri(typeof(DeploymentServiceTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, "..", "..", "..", "..", "..", "..", "development",
                "azure-devops-mock", filename);
            if (File.Exists(path))
            {
                string environments = File.ReadAllText(path);
                EnvironmentsModel environmentsList =
                    System.Text.Json.JsonSerializer.Deserialize<EnvironmentsModel>(environments);

                return environmentsList.Environments;
            }

            return null;
        }

        private static List<KubernetesDeployment> GetKubernetesDeployments(string filename)
        {
            string unitTestFolder =
                Path.GetDirectoryName(new Uri(typeof(DeploymentServiceTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "KubernetesDeployments", filename);
            if (!File.Exists(path))
            {
                return null;
            }

            string deployments = File.ReadAllText(path);
            return JsonConvert.DeserializeObject<List<KubernetesDeployment>>(deployments);
        }
    }
}
