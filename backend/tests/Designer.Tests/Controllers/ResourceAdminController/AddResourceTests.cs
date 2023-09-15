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
    public class AddResourceTests : ResourceAdminControllerTestsBaseClass<AddResourceTests>
    {

        public AddResourceTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ResourceAdminController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task AddServiceResource_StatusCreated()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/addresource";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

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

            RepositoryMock.Setup(r => r.AddServiceResource(It.IsAny<string>(), It.IsAny<ServiceResource>())).Returns(new StatusCodeResult(201));
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(serviceResource), System.Text.Encoding.UTF8, "application/json");

            //Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

    }
}
