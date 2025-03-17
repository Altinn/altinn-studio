using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Moq;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services
{
    public class ProcessModelingServiceTests : FluentTestsBase<ProcessModelingServiceTests>
    {
        private readonly AltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly IAppDevelopmentService _appDevelopmentService;
        public string CreatedTestRepoPath { get; set; }

        public ProcessModelingServiceTests()
        {
            var schemaModelServiceMock = new Mock<ISchemaModelService>();
            _altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            _appDevelopmentService = new AppDevelopmentService(_altinnGitRepositoryFactory, schemaModelServiceMock.Object);
        }

        [Theory]
        [InlineData("ttd", "app-with-process-and-layoutsets", "testUser")]
        public async Task GetTaskTypeFromProcessDefinition_GivenProcessDefinition_ReturnsTaskType(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();

            CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            IProcessModelingService processModelingService = new ProcessModelingService(_altinnGitRepositoryFactory, _appDevelopmentService);

            // Act
            string taskType = await processModelingService.GetTaskTypeFromProcessDefinition(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer), "layoutSet1");

            // Assert
            Assert.Equal("data", taskType);
        }
    }
}
