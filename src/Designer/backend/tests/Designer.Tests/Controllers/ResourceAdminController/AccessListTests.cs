using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class AccessListTests : ResourceAdminControllerTestsBaseClass<AccessListTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public AccessListTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetAccessLists_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/accesslist";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);


            ResourceRegistryMock.Setup(r => r.GetAccessLists(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(new PagedAccessListResponse());

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetAccessList_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/accesslist/test-list";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            AccessList list = new AccessList()
            {
                Identifier = "test-list",
                Name = "Test list",
                Description = ""
            };

            ResourceRegistryMock.Setup(r => r.GetAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(list);

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceAccessLists_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/ttd_resource/accesslists/";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);


            ResourceRegistryMock.Setup(r => r.GetResourceAccessLists(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(new PagedAccessListResponse());

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task CreateAccessList_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/accesslist/";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            AccessList list = new AccessList()
            {
                Identifier = "test-list",
                Name = "Test list",
                Description = ""
            };

            ResourceRegistryMock.Setup(r => r.CreateAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<AccessList>())).ReturnsAsync(list);
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(list), Encoding.UTF8, "application/json");

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task DeleteAccessList_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/accesslist/test-liste";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, uri);

            ResourceRegistryMock.Setup(r => r.DeleteAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(new StatusCodeResult(204));

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task UpdateAccessList_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/accesslist/test-liste/";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, uri);

            AccessList list = new AccessList()
            {
                Identifier = "test-list",
                Name = "Test list",
                Description = ""
            };

            ResourceRegistryMock.Setup(r => r.UpdateAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<AccessList>())).ReturnsAsync(list);
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(list), Encoding.UTF8, "application/json");

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task AddAccessListMember_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/accesslist/test-liste/members/";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            ResourceRegistryMock.Setup(r => r.AddAccessListMembers(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<AccessListOrganizationNumbers>(), It.IsAny<string>())).ReturnsAsync(new StatusCodeResult(201));
            AccessListOrganizationNumbers payload = new()
            {
                Data = ["991825827"]
            };
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        [Fact]
        public async Task RemoveAccessListMember_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/accesslist/test-liste/members/";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, uri);

            ResourceRegistryMock.Setup(r => r.RemoveAccessListMembers(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<AccessListOrganizationNumbers>(), It.IsAny<string>())).ReturnsAsync(new StatusCodeResult(204));
            AccessListOrganizationNumbers payload = new()
            {
                Data = ["991825827"]
            };
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task AddResourceAccessList_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/ttd_resource/accesslists/test-liste";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            ResourceRegistryMock.Setup(r => r.AddResourceAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(HttpStatusCode.OK);

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task RemoveResourceAccessList_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/testEnv/ttd/resources/ttd_resource/accesslists/test-liste";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, uri);

            ResourceRegistryMock.Setup(r => r.RemoveResourceAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(HttpStatusCode.NoContent);

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task GetAllAccessLists_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/allaccesslists";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            ResourceRegistryMock.Setup(r => r.GetAccessLists(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(new PagedAccessListResponse());

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
