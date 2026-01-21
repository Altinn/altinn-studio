using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class AddResourceTests(WebApplicationFactory<Program> factory)
        : ResourceAdminControllerTestsBaseClass<AddResourceTests>(factory),
            IClassFixture<WebApplicationFactory<Program>>
    {
        [Fact]
        public async Task AddServiceResource_StatusCreated()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/addresource";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, uri);

            ServiceResource serviceResource = new()
            {
                Identifier = "resource1",
                Title = new ServiceResourceTranslatedString
                {
                    En = "resourcetest",
                    Nb = "ressurstest",
                },
                Description = new ServiceResourceTranslatedString
                {
                    En = "test of resourceadminController",
                    Nb = "test av resourceAdminController",
                },
                RightDescription = new ServiceResourceTranslatedString
                {
                    En = "Access Management",
                    Nb = "Tilgangsstyring",
                },
                Homepage = "test.no",
                Status = "Active",
                ContactPoints = null,
                IsPartOf = "Altinn",
                ThematicArea = "",
                ResourceReferences = GetTestResourceReferences(),
                Delegable = true,
                Visible = true,
                HasCompetentAuthority = new CompetentAuthority
                {
                    Organization = "ttd",
                    Orgcode = "test",
                    Name = [],
                },
                Keywords = GetTestKeywords(),
                ResourceType = ResourceType.Default,
            };

            RepositoryMock
                .Setup(r => r.AddServiceResource(It.IsAny<string>(), It.IsAny<ServiceResource>()))
                .Returns(new StatusCodeResult(201));
            httpRequestMessage.Content = new StringContent(
                JsonConvert.SerializeObject(serviceResource),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }
    }
}
