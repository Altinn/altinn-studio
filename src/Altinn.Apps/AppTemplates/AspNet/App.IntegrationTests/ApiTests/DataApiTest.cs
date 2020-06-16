using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;

using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;

using Newtonsoft.Json;

using Xunit;

namespace App.IntegrationTests.ApiTests
{
    public class DataApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public DataApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Create_RequestWithXmlHasInvalidModelInBody_ReturnsValidationErrors_NoDataIsStored()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = "/ttd/model-validation/instances/1337/8fab6615-3c57-484b-bd32-3065be958a1e/data?dataType=default";
            string requestBody = "<?xml version=\"1.0\"?><Skjema xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" skjemanummer=\"hei\" spesifikasjonsnummer=\"9812\" blankettnummer=\"AFP-01\" tittel=\"Arbeidsgiverskjema AFP\" gruppeid=\"8818\"><Foretak-grp-8820 gruppeid=\"8820\"><EnhetNavnEndring-datadef-31 orid=\"31\">Test Test 123</EnhetNavnEndring-datadef-31></Foretak-grp-8820></Skjema>";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/xml")
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("There is an error in XML document", responseContent);
        }

        [Fact]
        public async Task Create_RequestWithJsonHasInvalidModelInBody_ReturnsValidationErrors_NoDataIsStored()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = "/ttd/model-validation/instances/1337/8fab6615-3c57-484b-bd32-3065be958a1e/data?dataType=default";
            string requestBody = "{\"skjemanummer\": \"hei\",\"spesifikasjonsnummer\": \"hade\",\"blankettnummer\": \"AFP-01\",\"tittel\": \"Arbeidsgiverskjema AFP\",\"gruppeid\": \"8818\",\"foretakgrp8820\": {\"gruppeid\": \"8820\",\"enhetNavnEndringdatadef31\": {\"orid\": \"31\",\"value\": \"Test Test 123\"}}}";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("Could not convert string to decimal: hei. Path 'skjemanummer'", responseContent);
        }

        [Fact]
        public async Task Data_Post_WithoutContent_OK()
        {
            Guid guid = new Guid("36133fb5-a9f2-45d4-90b1-f6d93ad40713");
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, guid);

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1337/36133fb5-a9f2-45d4-90b1-f6d93ad40713/data?dataType=default")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, guid);
        }

        /// <summary>
        /// Test case: Send request to get app
        /// Expected: Response with result permit returns status OK
        /// </summary>
        [Fact]
        public async Task Data_Get_OK()
        {
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, new Guid("46133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstance("tdd", "endring-av-navn", 1337, new Guid("46133fb5-a9f2-45d4-90b1-f6d93ad40713"));

            await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        /// <summary>
        /// Test case: Send request to get app
        /// Expected: Response with result deny returns status Forbidden
        /// </summary>
        [Fact]
        public async Task Data_Get_Forbidden_NotAuthorized()
        {
            string token = PrincipalUtil.GetToken(2);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

             /// <summary>
        /// Test case: Send request to get app with min authentication level 3, user has level 2
        /// Expected: Response with result permit and status Forbidden
        /// </summary>
        [Fact]
        public async Task Data_Get_Forbidden_ToLowAuthenticationLevel()
        {
            string token = PrincipalUtil.GetToken(1,1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Data_Get_With_Calculation()
        {
            string token = PrincipalUtil.GetToken(1337);
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, new Guid("182e053b-3c74-46d4-92ec-a2828289a877"));

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1337/182e053b-3c74-46d4-92ec-a2828289a877/data/7dfeffd1-1750-4e4a-8107-c6741e05d2a9")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new Guid("182e053b-3c74-46d4-92ec-a2828289a877"));
            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Contains("\"journalnummerdatadef33316\":{\"orid\":33316,\"value\":1001}", responseContent);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Data_Post_With_DataCreation()
        {
            Guid guid = new Guid("609efc9d-4496-4f0b-9d20-808dc2c1876d");
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, guid);

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/custom-validation/instances/1337/609efc9d-4496-4f0b-9d20-808dc2c1876d/data?dataType=default")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/custom-validation/instances/1337/609efc9d-4496-4f0b-9d20-808dc2c1876d/data/{dataElement.Id}")
            {
            };

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("\"enhetNavnEndringdatadef31\":{\"orid\":31,\"value\":\"Test Test 123\"}", responseContent);

            TestDataUtil.DeleteInstanceAndData("tdd", "custom-validation", 1337, guid);
        }

        /// <summary>
        /// Test case: post data with prefill setup
        /// Expected: returning data should contain prefilled values
        /// </summary>
        [Fact]
        public async Task Data_Post_With_Prefill_OK()
        {
            Guid guid = new Guid("36133fb5-a9f2-45d4-90b1-f6d93ad40713");
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 1337, guid);

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Fetch data element
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/tdd/endring-av-navn/instances/1337/{guid}/data?dataType=default"){};
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);

            // Fetch data and compare with expected prefill
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/endring-av-navn/instances/1337/{guid}/data/{dataElement.Id}"){};
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var skjema = JsonConvert.DeserializeObject<App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn.Skjema>(responseContent);
            Assert.Equal("01039012345", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknyttetGardNavndatadef34931.value);
            Assert.Equal("Oslo", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknyttetPersonsEtternavndatadef34930.value);
            Assert.Equal("Grev Wedels Plass", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknytningBeskrivelsedatadef34928.value);

            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 1337, guid);
        }

        /// <summary>
        /// Test case: post data with prefill setup for an org
        /// Expected: returning data should contain prefilled values
        /// </summary>
        [Fact]
        public async Task Data_Post_With_Prefill_Org_OK()
        {
            Guid guid = new Guid("37133fb5-a9f2-45d4-90b1-f6d93ad40713");
            TestDataUtil.PrepareInstance("tdd", "endring-av-navn", 500600, guid);

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Fetch data element
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/tdd/endring-av-navn/instances/500600/{guid}/data?dataType=default"){};
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);

            // Fetch data and compare with expected prefill
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/endring-av-navn/instances/500600/{guid}/data/{dataElement.Id}"){};
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var skjema = JsonConvert.DeserializeObject<App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn.Skjema>(responseContent);
            Assert.Equal("Sofies Gate 2", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknyttetGardNavndatadef34931.value);
            Assert.Equal("EAS Health Consulting", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknyttetPersonsEtternavndatadef34930.value);
            Assert.Equal("http://setrabrl.no", skjema.Tilknytninggrp9315.TilknytningTilNavnetgrp9316.TilknytningMellomnavn2grp9353.PersonMellomnavnAndreTilknytningBeskrivelsedatadef34928.value);

            TestDataUtil.DeleteInstanceAndData("tdd", "endring-av-navn", 500600, guid);
        }

        /// <summary>
        /// Test case: post data as a user not included in allowed contributers
        /// Expected: no match in allowed contributers. Forbidden is returned.
        /// </summary>
        [Fact]
        public async Task Data_Post_WithContributerRestriction_Forbidden()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=customElement";

            HttpResponseMessage response = await client.PostAsync(url, new StringContent(string.Empty));
            await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        /// <summary>
        /// Test case: post data as a org with org name included in allowed contributers
        /// Expected: match in allowed contributers. Data element is uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_WithContributerOrgRestriction_Ok()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("tdd");

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=customElement";
            HttpContent content = new StringContent(string.Empty);
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=test.pdf");

            HttpResponseMessage response = await client.PostAsync(url, content);
            await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        /// <summary>
        /// Test case: post data as a org with org number included in allowed contributers
        /// Expected: match in allowed contributers. Data element is uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_WithContributerOrgNoRestriction_Ok()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("nav", "160694123");

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=customElement";
            HttpContent content = new StringContent(string.Empty);
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=test.pdf");

            HttpResponseMessage response = await client.PostAsync(url, content);
            await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        /// <summary>
        /// Test case: post data without content disposition header in request
        /// Expected: Bad request. Data element is not uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_MissingContentDispHeader_BadRequest()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("nav", "160694123");
            string expectedMsg = "Invalid data provided. Error: Conent-Disposition header containing 'filename' must be included in request.";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=specificFileType";
            HttpContent content = new StringContent(string.Empty);

            HttpResponseMessage response = await client.PostAsync(url, content);
            string message = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(expectedMsg, message);
        }

        /// <summary>
        /// Test case: post data without filename in content disposition header in request
        /// Expected: Bad request. Data element is not uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_MissingFilenameInHeader_BadRequest()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("nav", "160694123");
            string expectedMsg = "Invalid data provided. Error: Content-Disposition header must contain 'filename'.";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=specificFileType";
            HttpContent content = new StringContent(string.Empty);
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment");

            HttpResponseMessage response = await client.PostAsync(url, content);
            string message = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(expectedMsg, message);
        }

        /// <summary>
        /// Test case: post data with invalid filename format in content disposition header in request
        /// Expected: Bad request. Data element is not uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_InvalidFilenameFormatInHeader_BadRequest()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("nav", "160694123");
            string expectedMsg = "Invalid data provided. Error: Invalid format for filename: testfile. Filename is expected to end with '.{filetype}'.";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=specificFileType";
            HttpContent content = new StringContent(string.Empty);
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=testfile");

            HttpResponseMessage response = await client.PostAsync(url, content);
            string message = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(expectedMsg, message);
        }

        /// <summary>
        /// Test case: post data with invalid filetype
        /// Expected: Bad request. Data element is not uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_InvalidFiletypeCorrectContentType_BadRequest()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("nav", "160694123");
            string expectedMsg = "Invalid data provided. Error: Invalid content type: text/xml. Please try another file. Permitted content types include: application/pdf, image/png, application/json";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=specificFileType";
            HttpContent content = new StringContent(string.Empty);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("text/xml");
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=testfile.xml");

            HttpResponseMessage response = await client.PostAsync(url, content);
            string message = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(expectedMsg, message);
        }

        /// <summary>
        /// Test case: post data with  validfiletype
        /// Expected: Bad request. Data element is not uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_ValidFiletype_Ok()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("nav", "160694123");

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=specificFileType";
            HttpContent content = new StringContent(string.Empty);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=testfile.pdf");

            HttpResponseMessage response = await client.PostAsync(url, content);
            string message = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        /// <summary>
        /// Test case: post data with validfiletype and complex filename
        /// Expected: Ok. Attachment uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_ValidComplexFileName_Ok()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("nav", "160694123");

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=specificFileType";
            HttpContent content = new StringContent(string.Empty);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=appsettings.development.json");

            HttpResponseMessage response = await client.PostAsync(url, content);
            string message = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        /// <summary>
        /// Test case: post data with  validfiletype
        /// Expected: Bad request. Data element is not uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_MisMatchContentTypeFileType_BadRequest()
        {
            string app = "contributer-restriction";
            Guid guid = new Guid("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd");
            TestDataUtil.DeleteInstance("tdd", app, 1337, guid);
            TestDataUtil.PrepareInstance("tdd", app, 1337, guid);
            string token = PrincipalUtil.GetOrgToken("nav", "160694123");
            string expectedMsg = "Invalid data provided. Error: Content type header text/xml does not match mime type application/pdf for uploaded file. Please fix header or upload another file.";

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string url = $"/tdd/{app}/instances/1337/{guid}/data?dataType=specificFileType";
            HttpContent content = new StringContent(string.Empty);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("text/xml");
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=testfile.pdf");

            HttpResponseMessage response = await client.PostAsync(url, content);
            string message = await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData ("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(expectedMsg, message);
        }
    }
}
