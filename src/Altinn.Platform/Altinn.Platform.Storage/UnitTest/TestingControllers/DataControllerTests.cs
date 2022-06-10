using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;

using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Fixture;
using Altinn.Platform.Storage.UnitTest.Mocks;
using Altinn.Platform.Storage.UnitTest.Mocks.Authentication;
using Altinn.Platform.Storage.UnitTest.Mocks.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;
using Altinn.Platform.Storage.Wrappers;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingControllers
{
    /// <summary>
    /// Represents a collection of integration tests of the <see cref="DataController"/>.
    /// </summary>
    public class DataControllerTests : IClassFixture<TestApplicationFactory<DataController>>
    {
        private readonly TestApplicationFactory<DataController> _factory;
        private readonly string _versionPrefix = "/storage/api/v1";
        private readonly JsonSerializerOptions _serializerOptions;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataControllerTests"/> class.
        /// </summary>
        /// <param name="factory">Platform storage fixture.</param>
        public DataControllerTests(TestApplicationFactory<DataController> factory)
        {
            _factory = factory;
            _serializerOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        }

        /// <summary>
        /// Scenario:
        ///   Add data element to created instances.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void Post_NewData_Ok()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/bc19107c-508f-48d9-bcd7-54ffec905306/data";
            HttpContent content = new StringContent("This is a blob file");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.PostAsync($"{dataPathWithData}?dataType=default", content);

            if (response.StatusCode.Equals(HttpStatusCode.InternalServerError))
            {
                string serverContent = await response.Content.ReadAsStringAsync();
                Assert.Equal("Hei", serverContent);
            }

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Add data element to created instances. Authenticated users is not authorized to perform this operation.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void Post_NewData_NotAuthorized()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/69c259d1-9c1f-4ab6-9d8b-5c210042dc4f/data";
            HttpContent content = new StringContent("This is a blob file");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1, 1337, 3));
            HttpResponseMessage response = await client.PostAsync($"{dataPathWithData}?dataType=default", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Add data element to created instances. Authenticated users is not authorized to perform this operation.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void Post_NewData_ToLowAuthenticationLevel()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/69c259d1-9c1f-4ab6-9d8b-5c210042dc4f/data";
            HttpContent content = new StringContent("This is a blob file");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 0));
            HttpResponseMessage response = await client.PostAsync($"{dataPathWithData}?dataType=default", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Add data element to created instances.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void OverwriteData_UpdateData_Ok()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/649388f0-a2c0-4774-bd11-c870223ed819/data/11f7c994-6681-47a1-9626-fcf6c27308a5";
            HttpContent content = new StringContent("This is a blob file with updated data");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.PutAsync($"{dataPathWithData}?dataType=default", content);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async void OverwriteData_DataElementDoesNotExist_ReturnsNotFound()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/649388f0-a2c0-4774-bd11-c870223ed819/data/11111111-6681-47a1-9626-fcf6c27308a5";
            HttpContent content = new StringContent("This is a blob file with updated data");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.PutAsync($"{dataPathWithData}?dataType=default", content);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Add data element to created instances.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void OverwriteData_UpdateData_Conflict()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/6aa47207-f089-4c11-9cb2-f00af6f66a47/data/24bfec2e-c4ce-4e82-8fa9-aa39da329fd5";
            HttpContent content = new StringContent("This is a blob file with updated data");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.PutAsync($"{dataPathWithData}?dataType=default", content);

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        }

        [Fact]
        public async void Delete_DataElement_Ok()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/649388f0-a2c0-4774-bd11-c870223ed819/data/11f7c994-6681-47a1-9626-fcf6c27308a5";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.DeleteAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async void Delete_DataElementDoesNotExist_ReturnsNotFound()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/649388f0-a2c0-4774-bd11-c870223ed819/data/11111111-6681-47a1-9626-fcf6c27308a5";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.DeleteAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async void Delete_DataElement_NotAuthorized()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/649388f0-a2c0-4774-bd11-c870223ed819/data/11f7c994-6681-47a1-9626-fcf6c27308a5";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1, 1, 3));
            HttpResponseMessage response = await client.DeleteAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElement_Ok()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/d91fd644-1028-4efd-924f-4ca187354514/data/f4feb26c-8eed-4d1d-9d75-9239c40724e9";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElementDoesNotExists_ReturnsNotFound()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/d91fd644-1028-4efd-924f-4ca187354514/data/11111111-8eed-4d1d-9d75-9239c40724e9";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElements_Ok()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/d91fd644-1028-4efd-924f-4ca187354514/dataelements/";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElementsAsEndUser_HardDeletedFilteredOut()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/4914257c-9920-47a5-a37a-eae80f950767/dataelements/";
            int expectedCount = 2;

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");
            string content = await response.Content.ReadAsStringAsync();
            DataElementList actual = JsonSerializer.Deserialize<DataElementList>(content, _serializerOptions);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedCount, actual.DataElements.Count);
        }

        [Fact]
        public async void Get_DataElementsAsAppOwner_HardDeletedIncluded()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/4914257c-9920-47a5-a37a-eae80f950767/dataelements/";
            int expectedCount = 3;

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken("ttd"));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");
            string content = await response.Content.ReadAsStringAsync();
            DataElementList actual = JsonSerializer.Deserialize<DataElementList>(content, _serializerOptions);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedCount, actual.DataElements.Count);
        }

        [Fact]
        public async void Get_DataElements_To_Low_Auth_Level()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/d91fd644-1028-4efd-924f-4ca187354514/dataelements/";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 1));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElements_NotAuthorized()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/d91fd644-1028-4efd-924f-4ca187354514/dataelements/";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1, 1, 3));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElement_NotAuthorized()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/d91fd644-1028-4efd-924f-4ca187354514/data/f4feb26c-8eed-4d1d-9d75-9239c40724e9";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1, 1, 3));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElement_ToLowAuthenticationLevel()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/d91fd644-1028-4efd-924f-4ca187354514/data/f4feb26c-8eed-4d1d-9d75-9239c40724e9";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 1));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElement_Org_Ok()
        {
            // Arrange
            string dataPathWithData = $"{_versionPrefix}/instances/1337/ca9da17c-904a-44d2-9771-a5420acfbcf3/data/28023597-516b-4a71-a77c-d3736912abd5";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken("tdd"));

            // Act
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElementAsEndUser_HardDeleted_NotFound()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/4914257c-9920-47a5-a37a-eae80f950767/data/887c5e56-6f73-494a-9730-6ebd11bffe88";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async void Get_DataElementAsAppOwner_HardDeletedIncluded()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/4914257c-9920-47a5-a37a-eae80f950767/data/887c5e56-6f73-494a-9730-6ebd11bffe88";

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken("ttd"));
            HttpResponseMessage response = await client.GetAsync($"{dataPathWithData}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async void Delete_Delayed_AutoDeleteMissing_BadRequest()
        {
            // Arrange
            string dataPathWithData = $"{_versionPrefix}/instances/1337/d91fd644-1028-4efd-924f-4ca187354514/data/f4feb26c-8eed-4d1d-9d75-9239c40724e9?delay=true";
            string expected = "\"DataType default does not support delayed deletion\"";
            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{dataPathWithData}");
            string actual = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(expected, actual);
        }

        [Fact]
        public async void Delete_Delayed_UpdateMethodCalledInRepository()
        {
            // Arrange
            DataElement de = TestDataUtil.GetDataElement("887c5e56-6f73-494a-9730-6ebd11bffe30");
            Mock<IDataRepository> dataRepositoryMock = new();
            dataRepositoryMock
                .Setup(dr => dr.Read(It.IsAny<Guid>(), It.IsAny<Guid>()))
                .ReturnsAsync(de);

            dataRepositoryMock
                .Setup(dr => dr.Update(It.Is<DataElement>(ude => ude.DeleteStatus.IsHardDeleted)))
                .ReturnsAsync((DataElement input) => { return input; });

            string dataPathWithData = $"{_versionPrefix}/instances/1337/4914257c-9920-47a5-a37a-eae80f950767/data/887c5e56-6f73-494a-9730-6ebd11bffe30?delay=true";
            HttpClient client = GetTestClient(dataRepositoryMock);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{dataPathWithData}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            dataRepositoryMock.VerifyAll();
        }

        [Fact]
        public async void Delete_Immediate_DeleteMethodCalledInRepository()
        {
            // Arrange
            DataElement de = TestDataUtil.GetDataElement("887c5e56-6f73-494a-9730-6ebd11bffe30");
            Mock<IDataRepository> dataRepositoryMock = new();
            dataRepositoryMock
                           .Setup(dr => dr.Read(It.IsAny<Guid>(), It.IsAny<Guid>()))
                .ReturnsAsync(de);

            dataRepositoryMock
                .Setup(dr => dr.DeleteDataInStorage(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync(true);

            dataRepositoryMock
                .Setup(dr => dr.Delete(It.IsAny<DataElement>()))
                .ReturnsAsync(true);

            string dataPathWithData = $"{_versionPrefix}/instances/1337/4914257c-9920-47a5-a37a-eae80f950767/data/887c5e56-6f73-494a-9730-6ebd11bffe30";
            HttpClient client = GetTestClient(dataRepositoryMock);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{dataPathWithData}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            dataRepositoryMock.VerifyAll();
        }

        [Fact]
        public async void Delete_EndUserDeletingAlreadyDeletedElement_NotFound()
        {
            // Arrange      
            string dataPathWithData = $"{_versionPrefix}/instances/1337/4914257c-9920-47a5-a37a-eae80f950767/data/887c5e56-6f73-494a-9730-6ebd11bffe88";
            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337, 1337, 3));

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{dataPathWithData}");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async void Delete_OrgDeletingAlreadyDeletedElement_RepositoryUpdateNotCalled()
        {
            // Arrange
            DataElement de = TestDataUtil.GetDataElement("887c5e56-6f73-494a-9730-6ebd11bffe88");
            Mock<IDataRepository> dataRepositoryMock = new();
            dataRepositoryMock = new();
            dataRepositoryMock
                .Setup(dr => dr.Read(It.IsAny<Guid>(), It.IsAny<Guid>()))
                .ReturnsAsync(de);

            string dataPathWithData = $"{_versionPrefix}/instances/1337/4914257c-9920-47a5-a37a-eae80f950767/data/887c5e56-6f73-494a-9730-6ebd11bffe88?delay=true";
            HttpClient client = GetTestClient(dataRepositoryMock);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken("ttd"));

            // Act
            HttpResponseMessage response = await client.DeleteAsync($"{dataPathWithData}");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            dataRepositoryMock.Verify(dr => dr.Update(It.IsAny<DataElement>()), Times.Never);
        }

        private HttpClient GetTestClient(Mock<IDataRepository> repositoryMock = null)
        {
            // No setup required for these services. They are not in use by the InstanceController
            Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
            Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();
            Mock<IPartiesWithInstancesClient> partiesWrapper = new Mock<IPartiesWithInstancesClient>();

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddMockRepositories();

                    if (repositoryMock != null)
                    {
                        services.AddSingleton(repositoryMock.Object);
                    }

                    services.AddSingleton(sasTokenProvider.Object);
                    services.AddSingleton(keyVaultWrapper.Object);
                    services.AddSingleton(partiesWrapper.Object);
                    services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
            }).CreateClient();

            return client;
        }
    }
}
