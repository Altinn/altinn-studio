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
using NuGet.Versioning;
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
            SemanticVersion version = SemanticVersion.Parse(versionString);

            IProcessModelingService processModelingService = new ProcessModelingService(new Mock<IAltinnGitRepositoryFactory>().Object);

            var result = processModelingService.GetProcessDefinitionTemplates(version).ToList();

            result.Count.Should().Be(expectedTemplates.Length);

            foreach (string expectedTemplate in expectedTemplates)
            {
                result.Should().Contain(expectedTemplate);
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
