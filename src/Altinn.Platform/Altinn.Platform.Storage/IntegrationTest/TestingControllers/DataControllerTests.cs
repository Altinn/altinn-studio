using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.IntegrationTest.Clients;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.IntegrationTest.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

using Moq;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest.TestingControllers
{
    /// <summary>
    /// Represents a collection of integration tests of the <see cref="DataController"/>.
    /// </summary>
    public class DataControllerTests : IClassFixture<PlatformStorageFixture>
    {
        private readonly string _versionPrefix = "/storage/api/v1";
        private readonly int _testInstanceOwnerId = 500;
        private string _invalidToken;
        private string _validToken;
        private string _validToken_level0;

        private readonly HttpClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataControllerTests"/> class.
        /// </summary>
        /// <param name="fixture">Platform storage fixture.</param>
        public DataControllerTests(PlatformStorageFixture fixture)
        {
            _client = fixture.Client;
            _validToken_level0 = PrincipalUtil.GetToken(1, 0);
            _invalidToken = PrincipalUtil.GetToken(2);
            _validToken = PrincipalUtil.GetToken(1);
        }

        /// <summary>
        /// Scenario:
        ///   Request to add confirm download on all data elements on an instance, but user isn't authorized.
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void Put_ConfirmDownload_OnAllData_NotAuthroized()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/dataelements";
            HttpContent content = new StringContent(string.Empty);

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _invalidToken);
            HttpResponseMessage response = await _client.PutAsync($"{dataPathWithData}/confirmDownload", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to add confirm download on all data elements on an instance, but user isn't authorized.
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void Put_ConfirmDownload_OnAllData_Authroized_WrongAuthenticationLevel()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/dataelements";
            HttpContent content = new StringContent(string.Empty);

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken_level0);
            HttpResponseMessage response = await _client.PutAsync($"{dataPathWithData}/confirmDownload", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to add confirm download on a data element on an instance, but user isn't authorized.
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void ConfirmDownload_NotAuthroized()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/dataelements/{Guid.NewGuid()}";
            HttpContent content = new StringContent(string.Empty);

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _invalidToken);
            HttpResponseMessage response = await _client.PutAsync($"{dataPathWithData}/confirmDownload", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to add confirm download to data element on an instance, but user isn't authorized.
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void ConfirmDownload_Authroized_WrongAuthenticationLevel()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/dataelements/{Guid.NewGuid()}";
            HttpContent content = new StringContent(string.Empty);

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken_level0);
            HttpResponseMessage response = await _client.PutAsync($"{dataPathWithData}/confirmDownload", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to delete data element on an instance, but user isn't authorized.. 
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void Delete_NotAuthorized()
        {
            string dataPathWithDataGuid = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/data/{Guid.NewGuid()}";

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _invalidToken);
            HttpResponseMessage response = await _client.DeleteAsync($"{dataPathWithDataGuid}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to delete data element on an instance, user is authorized, but too low authentication level
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void Delete_WrongAuthenticationLevel()
        {
            string dataPathWithDataGuid = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/data/{Guid.NewGuid()}";

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken_level0);
            HttpResponseMessage response = await _client.DeleteAsync($"{dataPathWithDataGuid}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to get a data element, user is authorized, but too low authentication level
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void Get_Authroized_WrongAuthenticationLevel()
        {
            string dataPathWithDataGuid = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/data/{Guid.NewGuid()}";

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken_level0);
            HttpResponseMessage response = await _client.GetAsync($"{dataPathWithDataGuid}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to get a data element, but user isn't authorized.
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void Get_NotAuthorized()
        {
            string dataPathWithDataGuid = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/data/{Guid.NewGuid()}";

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _invalidToken);
            HttpResponseMessage response = await _client.GetAsync($"{dataPathWithDataGuid}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///  Get all data elements registered for an instance, user is authorized, but too low authentication level
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void GetMany_Authroized_WrongAuthenticationLevel()
        {
            string dataPathWithDataGuid = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/dataelements";

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken_level0);
            HttpResponseMessage response = await _client.GetAsync($"{dataPathWithDataGuid}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///  Get all data elements registered for an instance, but user isn't authorized.
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void GetMany_NotAuthorized()
        {
            string dataPathWithDataGuid = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/data/{Guid.NewGuid()}";

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _invalidToken);
            HttpResponseMessage response = await _client.GetAsync($"{dataPathWithDataGuid}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to create and upload data on an instance, user is authorized, but too low authentication level
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void CreateAndUploadData_Authroized_WrongAuthenticationLevel()
        {
            string dataPathWithDataGuid = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/data";

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken_level0);
            HttpResponseMessage response = await _client.PostAsync($"{dataPathWithDataGuid}", null);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Scenario:
        ///   Request to create and upload data on an instance, but user isn't authorized.
        /// Expected:
        ///   Request is stopped by PEP.
        /// Success:
        ///   403 forbidden status code returned. 
        /// </summary>
        [Fact]
        public async void CreateAndUploadData_NotAuthorized()
        {
            string dataPathWithDataGuid = $"{_versionPrefix}/instances/{_testInstanceOwnerId}/{Guid.NewGuid()}/data";

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _invalidToken);
            HttpResponseMessage response = await _client.PostAsync($"{dataPathWithDataGuid}", null);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}
