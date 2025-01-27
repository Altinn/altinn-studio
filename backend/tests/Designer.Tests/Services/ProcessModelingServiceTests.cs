﻿using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Moq;
using NuGet.Versioning;
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
        [MemberData(nameof(TemplatesTestData))]
        public void GetProcessDefinitionTemplates_GivenVersion_ReturnsListOfTemplates(string versionString, params string[] expectedTemplates)
        {
            SemanticVersion version = SemanticVersion.Parse(versionString);

            IProcessModelingService processModelingService = new ProcessModelingService(new Mock<IAltinnGitRepositoryFactory>().Object, _appDevelopmentService);

            var result = processModelingService.GetProcessDefinitionTemplates(version).ToList();

            Assert.Equal(expectedTemplates.Length, result.Count);

            foreach (string expectedTemplate in expectedTemplates)
            {
                Assert.Contains(expectedTemplate, result);
            }
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

        public static IEnumerable<object[]> TemplatesTestData => new List<object[]>
        {
            new object[]
            {
                "8.0.0", new string[]
                {
                    "start-data-confirmation-end.bpmn",
                    "start-data-confirmation-feedback-end.bpmn",
                    "start-data-end.bpmn",
                    "start-data-signing-end.bpmn",
                }
            },
            new object[]
            {
                "7.0.0", new string[]
                {
                    "start-data-confirmation-end.bpmn",
                    "start-data-data-data-end.bpmn",
                    "start-data-end.bpmn",
                }
            },
            new object[]
            {
                "6.0.0"
            }
        };
    }
}
