using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetPublishStatusByIdTests : ResourceAdminControllerTestsBaseClass<GetPublishStatusByIdTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public GetPublishStatusByIdTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetResourceStatusById_Passing_Repository_OK()
        {
            // Arrange
            string uri = $"{VersionPrefix}/ttd/resources/publishstatus/ttd-resources/ttd_testresource";

            RepositoryMock
                .Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>()))
                .Returns(Task.FromResult(new ServiceResource
                {
                    Identifier = "testresource",
                    Title = new Dictionary<string, string>(),
                    Description = new Dictionary<string, string>(),
                    RightDescription = new Dictionary<string, string>(),
                    Homepage = "test.no",
                    Status = string.Empty,
                    IsPartOf = string.Empty,
                    ThematicArea = string.Empty,
                    ResourceReferences = GetTestResourceReferences(),
                    Delegable = true,
                    Visible = true,
                    Version = "2023.12",
                    HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                    Keywords = GetTestKeywords(),
                    ResourceType = ResourceType.Default,
                }));

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        }

    }
}
