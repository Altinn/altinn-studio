using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class AccessListTests : ResourceAdminControllerTestsBaseClass<AddResourceTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public AccessListTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetAccessLists_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/accesslist?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);


            ResourceRegistryMock.Setup(r => r.GetAccessLists(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(new PagedAccessListResponse());

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
            string uri = $"{VersionPrefix}/ttd/resources/accesslist/test-list?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            AccessList list = new AccessList()
            {
                Identifier = "test-list",
                Name = "Test list",
                Description = "",
                Members = new List<AccessListMember>()
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
            string uri = $"{VersionPrefix}/ttd/resources/ttd_resource/accesslists/?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);


            ResourceRegistryMock.Setup(r => r.GetResourceAccessLists(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>())).ReturnsAsync(new PagedAccessListResponse());

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
            string uri = $"{VersionPrefix}/ttd/resources/accesslist/?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            AccessList list = new AccessList()
            {
                Identifier = "test-list",
                Name = "Test list",
                Description = "",
                Members = new List<AccessListMember>()
            };

            ResourceRegistryMock.Setup(r => r.CreateAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<AccessList>())).ReturnsAsync(list);
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(list), Encoding.UTF8, "application/json");

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        [Fact]
        public async Task DeleteAccessList_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/accesslist/test-liste?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, uri);

            ResourceRegistryMock.Setup(r => r.DeleteAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(HttpStatusCode.NoContent);

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
            string uri = $"{VersionPrefix}/ttd/resources/accesslist/test-liste/?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, uri);

            AccessList list = new AccessList()
            {
                Identifier = "test-list",
                Name = "Test list",
                Description = "",
                Members = new List<AccessListMember>()
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
            string uri = $"{VersionPrefix}/ttd/resources/accesslist/test-liste/members/991825827?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            ResourceRegistryMock.Setup(r => r.AddAccessListMember(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(HttpStatusCode.OK);

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task RemoveAccessListMember_Ok()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/accesslist/test-liste/members/991825827?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, uri);

            ResourceRegistryMock.Setup(r => r.RemoveAccessListMember(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(HttpStatusCode.NoContent);

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
            string uri = $"{VersionPrefix}/ttd/resources/ttd_resource/accesslists/test-liste?env=testEnv";
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
            string uri = $"{VersionPrefix}/ttd/resources/ttd_resource/accesslists/test-liste?env=testEnv";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, uri);

            ResourceRegistryMock.Setup(r => r.RemoveResourceAccessList(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(HttpStatusCode.NoContent);

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

            //Assert
            RepositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }
    }
}

