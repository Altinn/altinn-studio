using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// test application controller.
    /// </summary>
    public class ApplicationTests : IClassFixture<PlatformStorageFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private readonly ApplicationClient applicationClient;
        private readonly string versionPrefix = "/storage/api/v1";
        private readonly string org = "test";

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationTests"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public ApplicationTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.applicationClient = new ApplicationClient(this.client);
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            string listUri = $"{versionPrefix}/applications/{org}";

            HttpResponseMessage listResponse = client.GetAsync(listUri).Result;

            if (listResponse.IsSuccessStatusCode)
            {
                string json = listResponse.Content.ReadAsStringAsync().Result;
           
                List<Application> applications = JsonConvert.DeserializeObject<List<Application>>(json);

                foreach (Application app in applications)
                {
                    string appId = app.Id;

                    string deleteUri = $"{versionPrefix}/applications/{appId}?hard=true";

                    HttpResponseMessage deleteResponse = client.DeleteAsync(deleteUri).Result;                    
                }
            }
            else
            {
                string json = listResponse.Content.ReadAsStringAsync().Result;
            }
        }

        private Application CreateApplication(string applicationId)
        {
            Application appInfo = new Application()
            {
                Id = applicationId,
                VersionId = "r33",
                Title = new Dictionary<string, string>(),
                Org = org,
            };

            appInfo.Title.Add("nb", "Tittel");

            return appInfo;
        }

        /// <summary>
        /// Create an application metadata object.
        /// </summary>
        [Fact]
        public async void CreateApplicationHappyDays()
        {
            string appId = "test/app20";
            string requestUri = $"{versionPrefix}/applications?appId={appId}";

            Application appInfo = CreateApplication(appId);

            HttpResponseMessage postResponse = await client.PostAsync(requestUri, appInfo.AsJson());

            postResponse.EnsureSuccessStatusCode();

            string content = postResponse.Content.ReadAsStringAsync().Result;
        }

        /// <summary>
        /// Create an applicaiton metadata object with wrong application id format.
        /// </summary>
        [Fact]
        public async void CreateApplicationWrongFormatApplicationId()
        {
            string appId = "TEST/app";

            string requestUri = $"{versionPrefix}/applications?appId={appId}";

            Application appInfo = CreateApplication(appId);

            HttpResponseMessage postResponse = await client.PostAsync(requestUri, appInfo.AsJson());

            Assert.Equal(HttpStatusCode.BadRequest, postResponse.StatusCode);
        }

        /// <summary>
        /// Soft delet an application.
        /// </summary>
        [Fact]
        public async void SoftdeleteApplication()
        {
            string appId = "test/app21";
            string requestUri = $"{versionPrefix}/applications?appId={appId}";

            Application appInfo = CreateApplication(appId);

            HttpResponseMessage postResponse = await client.PostAsync(requestUri, appInfo.AsJson());
            
            postResponse.EnsureSuccessStatusCode();

            string json = await postResponse.Content.ReadAsStringAsync();
            Application existingApplication = JsonConvert.DeserializeObject<Application>(json);

            // do the delete
            requestUri = $"{versionPrefix}/applications/{appId}";            
            HttpResponseMessage deleteResponse = await client.DeleteAsync(requestUri);

            deleteResponse.EnsureSuccessStatusCode();

            string content = await deleteResponse.Content.ReadAsStringAsync();
            Application softDeletedApplication = JsonConvert.DeserializeObject<Application>(content);

            Assert.NotEqual(softDeletedApplication.ValidTo, existingApplication.ValidTo);

            Assert.True(softDeletedApplication.ValidTo < DateTime.UtcNow);
        }

        /// <summary>
        /// Create an application, read one, update it and get it one more time.
        /// </summary>
        [Fact]
        public async void GetAndUpdateApplication()
        {
            string appId = "test/app22";

            string requestUri = $"{versionPrefix}/applications?appId={appId}";
           
            Application appInfo = CreateApplication(appId);

            // create one
            HttpResponseMessage postResponse = await client.PostAsync(requestUri, appInfo.AsJson());

            postResponse.EnsureSuccessStatusCode();

            requestUri = $"{versionPrefix}/applications/{appId}";

            // read one
            HttpResponseMessage getResponse = await client.GetAsync(requestUri);

            getResponse.EnsureSuccessStatusCode();

            string json = await getResponse.Content.ReadAsStringAsync();
            Application application = JsonConvert.DeserializeObject<Application>(json);                

            application.MaxSize = 2000;

            // update it
            HttpResponseMessage putResponse = await client.PutAsync(requestUri, application.AsJson());

            putResponse.EnsureSuccessStatusCode();

            // get it again
            HttpResponseMessage getResponse2 = await client.GetAsync(requestUri);

            getResponse2.EnsureSuccessStatusCode();

            string json2 = await getResponse2.Content.ReadAsStringAsync();
            Application application2 = JsonConvert.DeserializeObject<Application>(json2);

            Assert.Equal(application.MaxSize, application2.MaxSize);
        }       
    }
}
