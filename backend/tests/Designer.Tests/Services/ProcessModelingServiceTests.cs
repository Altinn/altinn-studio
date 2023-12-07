using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Xml.Serialization;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using FluentAssertions;
using Moq;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services
{
    public class ProcessModelingServiceTests : FluentTestsBase<ProcessModelingServiceTests>
    {
        [Theory]
        [MemberData(nameof(TemplatesTestData))]
        public void GetProcessDefinitionTemplates_GivenVersion_ReturnsListOfTemplates(string versionString, params string[] expectedTemplates)
        {
            Version version = Version.Parse(versionString);

            IProcessModelingService processModelingService = new ProcessModelingService(new Mock<IAltinnGitRepositoryFactory>().Object);

            var result = processModelingService.GetProcessDefinitionTemplates(version).ToList();

            result.Count.Should().Be(expectedTemplates.Length);

            foreach (string expectedTemplate in expectedTemplates)
            {
                result.Should().Contain(expectedTemplate);
            }
        }

        [Theory]
        [InlineData("ttd", "app-with-process", "testUser", "Task_1", "NewTaskName")]
        public async void UpdateProcessTaskNameAsync_GivenTaskIdAndTaskName_UpdatesTaskName(string org, string repo, string developer,  string taskId, string newTaskName)
        {
            // Arrange
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);
            await TestDataHelper.CopyRepositoryForTest(org, repo, developer, targetRepository);

            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                IProcessModelingService processModelingService = new ProcessModelingService(altinnGitRepositoryFactory);

                // Act
                using Stream result = await processModelingService.UpdateProcessTaskNameAsync(editingContext, taskId, newTaskName);
                XmlSerializer serializer = new(typeof(Definitions));
                Definitions definitions = (Definitions)serializer.Deserialize(result);

                // Assert
                definitions.Process.Tasks.First(t => t.Id == taskId).Name.Should().Be(newTaskName);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
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
