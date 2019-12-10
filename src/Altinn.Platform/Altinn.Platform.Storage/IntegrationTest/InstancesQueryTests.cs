using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.IntegrationTest.Clients;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.IntegrationTest.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    ///  Tests data service REST api.
    /// </summary>
    [Collection("Sequential")]
    public class InstancesQueryTests : IClassFixture<PlatformStorageFixture>, IClassFixture<DatabaseFixture>, IClassFixture<CosmosDBFixture>
    {
        private readonly PlatformStorageFixture _fixture;
        private readonly InstanceClient _instanceClient;
        private readonly string _testOrg = "tdd";
        private readonly string _testAppId = "tdd/m1000";
        private readonly int _testInstanceOwnerId = 1001;
        private readonly string _versionPrefix = "/storage/api/v1";
        private readonly string _validToken;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceStorageTests"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public InstancesQueryTests(PlatformStorageFixture fixture)
        {
            _fixture = fixture;
            _instanceClient = new InstanceClient(_fixture.CreateClient());
            _validToken = PrincipalUtil.GetToken(1);
            LoadTestData();
            CreateTestApplication(_testAppId);
        }        

        /// <summary>
        ///  Checks that multiple instances can be returned with query param.
        /// </summary>
        [Fact]
        public async void QueryProcessCurrentTaskSubmit()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=100&process.currentTask=Submit_1";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);
            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.Equal(200, totalHits);
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with query param. gt: - greater than, lt: - less than
        /// </summary>
        [Fact]
        public async void QueryProcessVisibleDateTimeGt()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=100&visibleAfter=gt:2019-05-01";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);

            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.True(totalHits >= 630);
        }

        /// <summary>
        ///  Query with labels.
        /// </summary>
        [Fact]
        public async void QueryProcessLabels()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=100&appOwner.labels=zero";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);

            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.Equal(200, totalHits);
        }

        /// <summary>
        ///  Query with labels.
        /// </summary>
        [Fact]
        public async void QueryProcessTwoLabels()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=100&appOwner.labels=one&appOwner.labels=two";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);

            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.Equal(400, totalHits);
        }

        /// <summary>
        ///  Query with labels.
        /// </summary>
        [Fact]
        public async void QueryProcessOneLabelWithOne()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=1000&appOwner.labels=one";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);

            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.Equal(700, totalHits);
        }

        /// <summary>
        ///  Query with labels.
        /// </summary>
        [Fact]
        public async void QueryProcessOneLabelWithOneCommaTwo()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=1000&appOwner.labels=one,two";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);

            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.Equal(400, totalHits);
        }

        /// <summary>
        ///  Checks that wrong syntax returns bad request
        /// </summary>
        [Fact]
        public async void QueryProcessIllegalVisibleDateTime()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=100&visibleAfter=2019-50-01";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        ///  Query with no result set
        /// </summary>
        [Fact]
        public async void QueryProcessNoResult()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=100&visibleAfter=gt:2022-12-31";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            QueryResponse<Instance> queryResponse = JsonConvert.DeserializeObject<QueryResponse<Instance>>(await response.Content.ReadAsStringAsync());

            Assert.Empty(queryResponse.Instances);
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with query param.
        /// </summary>
        [Fact]
        public async void QueryProcessVisibleDateTimeEq()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=1000&visibleAfter=2019-07-10T00:00:00Z";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);

            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.Equal(5, totalHits);
        }

        /// <summary>
        ///  Checks that a local date performs ok.
        /// </summary>
        [Fact]
        public async void QueryProcessVisibleLocalDate()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=1000&visibleAfter=2019-03-25T02:00:00%2B02:00";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);

            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.Equal(3, totalHits);
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with query param.
        /// </summary>
        [Fact]
        public async void QueryProcessVisibleDateTimeBetween()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=1000&visibleAfter=gt:2019-07-01&visibleAfter=lt:2019-08-01";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);

            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.True(totalHits >= 79);
        }

        /// <summary>
        ///  Check that storage returns bad request if illegal query parameter is set.
        /// </summary>
        [Fact]
        public async void GetInstancesWithIllegalQueryParam()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?instanceOwnerId=500";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);            
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with org query param.
        /// </summary>
        [Fact]
        public async void GetInstancesForOrg()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?org={_testOrg}";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(json);

            int totalHits = jsonObject["totalHits"].Value<int>();
            Assert.True(totalHits >= 1000);

            List<Instance> instances = jsonObject["instances"].ToObject<List<Instance>>();
            Assert.True(instances.Count >= 100);
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with query param.
        /// </summary>
        [Fact]
        public async void GetInstancesWithContinuationTokenAndGetNext()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=500";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);
            var result = jsonObject["instances"];

            List<Instance> instances = result.ToObject<List<Instance>>();
            Assert.Equal(500, instances.Count);

            var nextUrl = jsonObject["next"].ToString();

            HttpResponseMessage response2 = await client.GetAsync(nextUrl);
            response2.EnsureSuccessStatusCode();

            string jsonString2 = await response2.Content.ReadAsStringAsync();
            JObject jsonObject2 = JObject.Parse(jsonString2);

            var result2 = jsonObject2["instances"];
            List<Instance> instances2 = result2.ToObject<List<Instance>>();
            Assert.Equal(500, instances2.Count);
            
            var selfUrl = jsonObject2["self"];
            Assert.NotNull(selfUrl);

            var selfUrl2 = jsonObject2["self"].ToString();

            HttpResponseMessage response3 = await client.GetAsync(selfUrl2);
            response3.EnsureSuccessStatusCode();            
        }

        private Application CreateTestApplication(string testAppId)
        {
            HttpClient client = _fixture.CreateClient();

            ApplicationClient appClient = new ApplicationClient(client);

            try
            {
                Application existingApp = appClient.GetApplication(testAppId);
                return existingApp;
            }
            catch (Exception)
            {
                // do nothing.
            }

            LanguageString title = new LanguageString
            {
                { "nb", "Testapplikasjon" },
                { "en", "Test application" }
            };

            return appClient.CreateApplication(testAppId, title);
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with org query param.
        /// </summary>
        [Fact]
        public async void GetInstancesWithAcceptJson()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}";

            // client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string contentType = response.Content.Headers.ContentType.ToString();

            Assert.Contains("application/json", contentType);

            string jsonString = await response.Content.ReadAsStringAsync();

            QueryResponse<Instance> queryResponse = JsonConvert.DeserializeObject<QueryResponse<Instance>>(jsonString);

            Assert.True(queryResponse.Instances.Count > 2);
        }

        /// <summary>
        ///  Queries ended time.
        ///  </summary>        
        [Fact]
        public async void GetInstancesWithEndedProcess()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&process.ended=lt:2019-02-01";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string contentType = response.Content.Headers.ContentType.ToString();

            Assert.Contains("application/json", contentType);

            string jsonString = await response.Content.ReadAsStringAsync();

            QueryResponse<Instance> queryResponse = JsonConvert.DeserializeObject<QueryResponse<Instance>>(jsonString);

            Assert.True(queryResponse.TotalHits > 500);
        }

#pragma warning disable xUnit1013
        /// <summary>
        /// Method to generate data with 1000 instances into cosmos db. Undocument the [Fact] line, run
        /// the test once, make the fact a comment again and run tests. 
        /// </summary>        
        // [Fact]
        public void GenerateData()
        {
            DatabaseFixture.GenerateTestdata(_fixture.CreateClient());
        }

        /// <summary>
        /// Saves data in cosmos db to file.
        /// </summary>
        // [Fact]
        public void SaveData()
        {
            HttpClient client = _fixture.CreateClient();

            string url = $"{_versionPrefix}/instances?appId={_testAppId}&size=1000";
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);

            HttpResponseMessage response = client.GetAsync(url).Result;
            response.EnsureSuccessStatusCode();

            string jsonString = response.Content.ReadAsStringAsync().Result;

            QueryResponse<Instance> queryResponse = JsonConvert.DeserializeObject<QueryResponse<Instance>>(jsonString);

            queryResponse.Next = null;
            queryResponse.Self = null;

            File.WriteAllText("../../../data/m1000-instances.json", JsonConvert.SerializeObject(queryResponse, Formatting.Indented));          
        }
        
        private void LoadTestData()
        {
            DatabaseFixture.LoadData(_testAppId, _instanceClient);
        }
    }
}
