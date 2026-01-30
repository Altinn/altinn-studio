using System.Collections.Generic;
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
    public class UpdateResourceTests : ResourceAdminControllerTestsBaseClass<UpdateResourceTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public UpdateResourceTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task UpdateServiceResource_StatusCreated()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/updateresource/resource1";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, uri);

            ServiceResource serviceResource = new ServiceResource
            {
                Identifier = "resource1",
                Title = new Dictionary<string, string> { { "en", "resourcetest" }, { "no", "ressurstest" } },
                Description = new Dictionary<string, string> { { "en", "test of resourceadminController" }, { "no", "test av resourceAdminController" } },
                RightDescription = new Dictionary<string, string> { { "en", "Access Management" }, { "no", "Tilgangsstyring" } },
                Homepage = "test.no",
                Status = "Active",
                IsPartOf = "Altinn",
                ThematicArea = "",
                ResourceReferences = GetTestResourceReferences(),
                Delegable = true,
                Visible = true,
                HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                Keywords = GetTestKeywords(),
                ResourceType = ResourceType.Default,
            };

            RepositoryMock.Setup(r => r.UpdateServiceResource(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<ServiceResource>())).Returns(new StatusCodeResult(201));
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(serviceResource), System.Text.Encoding.UTF8, "application/json");

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }
    }
}
