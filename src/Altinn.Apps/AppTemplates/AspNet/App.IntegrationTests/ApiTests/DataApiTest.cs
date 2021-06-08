using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.Common.Models;
using Altinn.App.IntegrationTests;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
using Microsoft.Extensions.Logging;
using Moq;
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
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances/1337/36133fb5-a9f2-45d4-90b1-f6d93ad40713/data?dataType=default");

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
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9");

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
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9");

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
            string token = PrincipalUtil.GetToken(1, 1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/46133fb5-a9f2-45d4-90b1-f6d93ad40713/data/4b9b5802-861b-4ca3-b757-e6bd5f582bf9");

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

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1337/182e053b-3c74-46d4-92ec-a2828289a877/data/7dfeffd1-1750-4e4a-8107-c6741e05d2a9");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            TestDataUtil.DeleteInstance("tdd", "custom-validation", 1337, new Guid("182e053b-3c74-46d4-92ec-a2828289a877"));
            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Contains("\"journalnummerdatadef33316\":{\"orid\":33316,\"value\":1001}", responseContent);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Data_Put_With_Calculation()
        {
            string token = PrincipalUtil.GetToken(1337);
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, new Guid("182e053b-3c74-46d4-92ec-a2828289a877"));

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/custom-validation/instances/1337/182e053b-3c74-46d4-92ec-a2828289a877/data/7dfeffd1-1750-4e4a-8107-c6741e05d2a9");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            HttpRequestMessage putRequestMessage = new HttpRequestMessage(HttpMethod.Put, "/tdd/custom-validation/instances/1337/182e053b-3c74-46d4-92ec-a2828289a877/data/7dfeffd1-1750-4e4a-8107-c6741e05d2a9")
            {
                Content = new StringContent(responseContent, Encoding.UTF8, "application/json"),
            };
            response = await client.SendAsync(putRequestMessage);
            TestDataUtil.DeleteInstanceAndData("tdd", "custom-validation", 1337, new Guid("182e053b-3c74-46d4-92ec-a2828289a877"));
            responseContent = await response.Content.ReadAsStringAsync();
            CalculationResult calculationResult = JsonConvert.DeserializeObject<CalculationResult>(responseContent);
            Assert.Equal(HttpStatusCode.SeeOther, response.StatusCode);
            Assert.Contains(calculationResult.ChangedFields.Keys, k => k == "OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.TestRepeatinggrp123[0].value");
            Assert.Equal(555, Convert.ToInt32(calculationResult.ChangedFields["OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.TestRepeatinggrp123[0].value"]));
            Assert.Equal(1000, Convert.ToInt32(calculationResult.ChangedFields["OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316.value"]));
            Assert.Null(calculationResult.ChangedFields["OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317"]);
        }

        [Fact]
        public async Task Data_Post_With_DataCreation()
        {
            Guid guid = new Guid("609efc9d-4496-4f0b-9d20-808dc2c1876d");
            TestDataUtil.PrepareInstance("tdd", "custom-validation", 1337, guid);

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "custom-validation");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/custom-validation/instances/1337/609efc9d-4496-4f0b-9d20-808dc2c1876d/data?dataType=default");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/custom-validation/instances/1337/609efc9d-4496-4f0b-9d20-808dc2c1876d/data/{dataElement.Id}");

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
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/tdd/endring-av-navn/instances/1337/{guid}/data?dataType=default");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);

            // Fetch data and compare with expected prefill
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/endring-av-navn/instances/1337/{guid}/data/{dataElement.Id}");
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
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/tdd/endring-av-navn/instances/500600/{guid}/data?dataType=default");
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(responseContent);

            // Fetch data and compare with expected prefill
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/tdd/endring-av-navn/instances/500600/{guid}/data/{dataElement.Id}");
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
            string expectedMsg = "Invalid data provided. Error: The request must include a Content-Disposition header";

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
            string expectedMsg = "Invalid data provided. Error: The Content-Disposition header must contain a filename";

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
            await response.Content.ReadAsStringAsync();
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
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=\"appsettings.development.json\"");

            HttpResponseMessage response = await client.PostAsync(url, content);
            await response.Content.ReadAsStringAsync();
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        /// <summary>
        /// Test case: post data with validfiletype and complex filename
        /// Expected: Ok. Attachment uploaded.
        /// </summary>
        [Fact]
        public async Task Data_Post_ValidFileNameStar_Ok()
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
            content.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("attachment; filename=\"appsettings.development.json\"; filename*=UTF-8''appsettings.staging.json");

            HttpResponseMessage response = await client.PostAsync(url, content);
            await response.Content.ReadAsStringAsync();
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
            TestDataUtil.DeleteInstanceAndData("tdd", app, 1337, guid);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(expectedMsg, message);
        }

        [Fact]
        public async Task Data_Put_PresentationTextsUpdated_NewValueIncluded()
        {
            // Arrange
            int expectedCount = 2;
            string expectedValue = "160694";
            string expectedKey = "AnotherField";
            string org = "ttd";
            string app = "presentationfields-app";
            string instanceGuid = "447ed22d-67a8-42c7-8add-cc35eba304f1";
            string dataGuid = "590ebc27-246e-4a0a-aea3-4296cb231d78";
            string token = PrincipalUtil.GetToken(1337);

            TestDataUtil.PrepareInstance(org, app, 1337, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/1337/{instanceGuid}/data/{dataGuid}?dataType=default";
            string requestBody = "{\"skjemanummer\":\"1472\",\"spesifikasjonsnummer\":\"9812\",\"blankettnummer\":\"AFP-01\",\"tittel\":\"ArbeidsgiverskjemaAFP\",\"gruppeid\":\"8818\",\"OpplysningerOmArbeidstakerengrp8819\":{\"Arbeidsforholdgrp8856\":{\"AnsattSammenhengendeAnsattAnsettelsedatadef33267\":{\"value\":\"SophieSalt\",\"orid\":\"33267\"},},\"Skjemainstansgrp8854\":{\"Journalnummerdatadef33316\":{\"value\":\"160694\"}}}}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            // Act
            await client.SendAsync(httpRequestMessage);

            HttpResponseMessage res = await client.GetAsync($"/{org}/{app}/instances/1337/{instanceGuid}");
            TestDataUtil.DeleteInstanceAndData(org, app, 1337, new Guid(instanceGuid));

            string responseContent = await res.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(expectedCount, instance.PresentationTexts.Count);
            Assert.True(instance.PresentationTexts.ContainsKey(expectedKey));
            Assert.Equal(expectedValue, instance.PresentationTexts[expectedKey]);
        }

        [Fact]
        public async Task Data_Put_PresentationTextsUpdated_ExistingValueRemoved()
        {
            // Arrange
            int expectedCount = 0;
            string org = "ttd";
            string app = "presentationfields-app";
            string instanceGuid = "447ed22d-67a8-42c7-8add-cc35eba304f1";
            string dataGuid = "590ebc27-246e-4a0a-aea3-4296cb231d78";
            string token = PrincipalUtil.GetToken(1337);

            TestDataUtil.PrepareInstance(org, app, 1337, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/1337/{instanceGuid}/data/{dataGuid}?dataType=default";
            string requestBody = "{\"skjemanummer\":\"1472\",\"spesifikasjonsnummer\":\"9812\",\"blankettnummer\":\"AFP-01\",\"tittel\":\"ArbeidsgiverskjemaAFP\",\"gruppeid\":\"8818\",\"OpplysningerOmArbeidstakerengrp8819\":{\"Arbeidsforholdgrp8856\":{\"AnsattSammenhengendeAnsattAnsettelsedatadef33267\":{\"orid\":\"33267\"}}}}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            // Act
            await client.SendAsync(httpRequestMessage);

            HttpResponseMessage res = await client.GetAsync($"/{org}/{app}/instances/1337/{instanceGuid}");
            TestDataUtil.DeleteInstanceAndData(org, app, 1337, new Guid(instanceGuid));

            string responseContent = await res.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(expectedCount, instance.PresentationTexts.Count);
        }

        [Fact]
        public async Task Data_Put_PresentationTextsUpdated_ExistingValueOverwritten()
        {
            // Arrange
            int expectedCount = 1;
            string expectedValue = "Andreas Dahl";
            string expectedKey = "Title";
            string org = "ttd";
            string app = "presentationfields-app";
            string instanceGuid = "447ed22d-67a8-42c7-8add-cc35eba304f1";
            string dataGuid = "590ebc27-246e-4a0a-aea3-4296cb231d78";
            string token = PrincipalUtil.GetToken(1337);

            TestDataUtil.PrepareInstance(org, app, 1337, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/1337/{instanceGuid}/data/{dataGuid}?dataType=default";
            string requestBody = "{\"skjemanummer\":\"1472\",\"spesifikasjonsnummer\":\"9812\",\"blankettnummer\":\"AFP-01\",\"tittel\":\"ArbeidsgiverskjemaAFP\",\"gruppeid\":\"8818\",\"OpplysningerOmArbeidstakerengrp8819\":{\"Arbeidsforholdgrp8856\":{\"AnsattSammenhengendeAnsattAnsettelsedatadef33267\":{\"value\":\"Andreas Dahl\",\"orid\":\"33267\"}}}}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            // Act
            await client.SendAsync(httpRequestMessage);

            HttpResponseMessage res = await client.GetAsync($"/{org}/{app}/instances/1337/{instanceGuid}");
            TestDataUtil.DeleteInstanceAndData(org, app, 1337, new Guid(instanceGuid));

            string responseContent = await res.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(expectedCount, instance.PresentationTexts.Count);
            Assert.True(instance.PresentationTexts.ContainsKey(expectedKey));
            Assert.Equal(expectedValue, instance.PresentationTexts[expectedKey]);
        }

        [Fact]
        public async Task Data_Put_DataValuesUpdated_NewValueIncluded()
        {
            // Arrange
            int expectedCount = 2;
            string expectedValue = "160694";
            string expectedKey = "AnotherField";
            string org = "ttd";
            string app = "datafields-app";
            string instanceGuid = "447ed22d-67a8-42c7-8add-cc35eba304f1";
            string dataGuid = "590ebc27-246e-4a0a-aea3-4296cb231d78";
            string token = PrincipalUtil.GetToken(1337);

            TestDataUtil.PrepareInstance(org, app, 1337, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/1337/{instanceGuid}/data/{dataGuid}?dataType=default";
            string requestBody = "{\"skjemanummer\":\"1472\",\"spesifikasjonsnummer\":\"9812\",\"blankettnummer\":\"AFP-01\",\"tittel\":\"ArbeidsgiverskjemaAFP\",\"gruppeid\":\"8818\",\"OpplysningerOmArbeidstakerengrp8819\":{\"Arbeidsforholdgrp8856\":{\"AnsattSammenhengendeAnsattAnsettelsedatadef33267\":{\"value\":\"SophieSalt\",\"orid\":\"33267\"},},\"Skjemainstansgrp8854\":{\"Journalnummerdatadef33316\":{\"value\":\"160694\"}}}}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            // Act
            await client.SendAsync(httpRequestMessage);

            HttpResponseMessage res = await client.GetAsync($"/{org}/{app}/instances/1337/{instanceGuid}");
            TestDataUtil.DeleteInstanceAndData(org, app, 1337, new Guid(instanceGuid));

            string responseContent = await res.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(expectedCount, instance.DataValues.Count);
            Assert.True(instance.DataValues.ContainsKey(expectedKey));
            Assert.Equal(expectedValue, instance.DataValues[expectedKey]);
        }

        [Fact]
        public async Task Data_Put_DataValuesUpdated_ExistingValueRemoved()
        {
            // Arrange
            int expectedCount = 0;
            string org = "ttd";
            string app = "datafields-app";
            string instanceGuid = "447ed22d-67a8-42c7-8add-cc35eba304f1";
            string dataGuid = "590ebc27-246e-4a0a-aea3-4296cb231d78";
            string token = PrincipalUtil.GetToken(1337);

            TestDataUtil.PrepareInstance(org, app, 1337, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/1337/{instanceGuid}/data/{dataGuid}?dataType=default";
            string requestBody = "{\"skjemanummer\":\"1472\",\"spesifikasjonsnummer\":\"9812\",\"blankettnummer\":\"AFP-01\",\"tittel\":\"ArbeidsgiverskjemaAFP\",\"gruppeid\":\"8818\",\"OpplysningerOmArbeidstakerengrp8819\":{\"Arbeidsforholdgrp8856\":{\"AnsattSammenhengendeAnsattAnsettelsedatadef33267\":{\"orid\":\"33267\"}}}}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            // Act
            await client.SendAsync(httpRequestMessage);

            HttpResponseMessage res = await client.GetAsync($"/{org}/{app}/instances/1337/{instanceGuid}");
            TestDataUtil.DeleteInstanceAndData(org, app, 1337, new Guid(instanceGuid));

            string responseContent = await res.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(expectedCount, instance.DataValues.Count);
        }

        [Fact]
        public async Task Data_Put_DataValuesUpdated_ExistingValueOverwritten()
        {
            // Arrange
            int expectedCount = 1;
            string expectedValue = "Andreas Dahl";
            string expectedKey = "Title";
            string org = "ttd";
            string app = "datafields-app";
            string instanceGuid = "447ed22d-67a8-42c7-8add-cc35eba304f1";
            string dataGuid = "590ebc27-246e-4a0a-aea3-4296cb231d78";
            string token = PrincipalUtil.GetToken(1337);

            TestDataUtil.PrepareInstance(org, app, 1337, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/instances/1337/{instanceGuid}/data/{dataGuid}?dataType=default";
            string requestBody = "{\"skjemanummer\":\"1472\",\"spesifikasjonsnummer\":\"9812\",\"blankettnummer\":\"AFP-01\",\"tittel\":\"ArbeidsgiverskjemaAFP\",\"gruppeid\":\"8818\",\"OpplysningerOmArbeidstakerengrp8819\":{\"Arbeidsforholdgrp8856\":{\"AnsattSammenhengendeAnsattAnsettelsedatadef33267\":{\"value\":\"Andreas Dahl\",\"orid\":\"33267\"}}}}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            // Act
            await client.SendAsync(httpRequestMessage);

            HttpResponseMessage res = await client.GetAsync($"/{org}/{app}/instances/1337/{instanceGuid}");
            TestDataUtil.DeleteInstanceAndData(org, app, 1337, new Guid(instanceGuid));

            string responseContent = await res.Content.ReadAsStringAsync();
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal(expectedCount, instance.DataValues.Count);
            Assert.True(instance.DataValues.ContainsKey(expectedKey));
            Assert.Equal(expectedValue, instance.DataValues[expectedKey]);
        }

        /// <summary>
        /// This test tests that you can combine data values defined and configured in the applicationmetadata.json
        /// with data values added manully by the app developer through the IInstance interface.
        /// Combining both methods should result in the two value sets beeing merged.
        /// </summary>
        [Fact]
        public async Task Instance_CustomDataValuesAdded_CustomValueMergedIn()
        {
            // Arrange
            string org = "ttd";
            string app = "datafields-app";
            string instanceGuid = "447ed22d-67a8-42c7-8add-cc35eba304f1";
            string dataGuid = "590ebc27-246e-4a0a-aea3-4296cb231d78";
            string token = PrincipalUtil.GetToken(1337);

            int expectedDataValuesCountAfterAutomaticUpdate = 2;
            int expectedDataValuesCountAfterManualUpdate = 3;
            string expectedKey = "AnotherField";
            string expectedValue = "160694";
            string expectedCustomKey = "customKey";
            string expectedCustomValue = "customValue";

            TestDataUtil.PrepareInstance(org, app, 1337, new Guid(instanceGuid));

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act - automatic update of data values done as a result of configuration and triggered by a change in the data.
            string instanceUri = $"/{org}/{app}/instances/1337/{instanceGuid}";

            string dataRequestUri = $"{instanceUri}/data/{dataGuid}?dataType=default";
            string dataRequestBody = "{\"skjemanummer\":\"1472\",\"spesifikasjonsnummer\":\"9812\",\"blankettnummer\":\"AFP-01\",\"tittel\":\"ArbeidsgiverskjemaAFP\",\"gruppeid\":\"8818\",\"OpplysningerOmArbeidstakerengrp8819\":{\"Arbeidsforholdgrp8856\":{\"AnsattSammenhengendeAnsattAnsettelsedatadef33267\":{\"value\":\"12\",\"orid\":\"33267\"},},\"Skjemainstansgrp8854\":{\"Journalnummerdatadef33316\":{\"value\":\"160694\"}}}}";
            HttpRequestMessage dataHttpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataRequestUri)
            {
                Content = new StringContent(dataRequestBody, Encoding.UTF8, "application/json")
            };

            await client.SendAsync(dataHttpRequestMessage);

            HttpResponseMessage responseAfterDataUpdate = await client.GetAsync($"{instanceUri}");
            string contentAfterDataUpdate = await responseAfterDataUpdate.Content.ReadAsStringAsync();
            Instance instanceAfterDataUpdate = JsonConvert.DeserializeObject<Instance>(contentAfterDataUpdate);

            // Assert - after automatic update
            Assert.Equal(HttpStatusCode.OK, responseAfterDataUpdate.StatusCode);
            Assert.Equal(expectedDataValuesCountAfterAutomaticUpdate, instanceAfterDataUpdate.DataValues.Count);
            Assert.True(instanceAfterDataUpdate.DataValues.ContainsKey(expectedKey));
            Assert.Equal(expectedValue, instanceAfterDataUpdate.DataValues[expectedKey]);

            // Act - manually updating data values with custom values by triggering complete process            
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instanceUri}/process/completeProcess");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            await response.Content.ReadAsStringAsync();
            response.EnsureSuccessStatusCode();

            HttpResponseMessage responseAfterCustomFieldsAdded = await client.GetAsync($"{instanceUri}");
            string contentAfterCustomFieldsAdded = await responseAfterCustomFieldsAdded.Content.ReadAsStringAsync();
            Instance instanceAfterCustomFieldsAdded = JsonConvert.DeserializeObject<Instance>(contentAfterCustomFieldsAdded);

            // Assert - after manual update
            Assert.Equal(expectedDataValuesCountAfterManualUpdate, instanceAfterCustomFieldsAdded.DataValues.Count);            
            Assert.True(instanceAfterCustomFieldsAdded.DataValues.ContainsKey(expectedCustomKey));
            Assert.Equal(expectedCustomValue, instanceAfterCustomFieldsAdded.DataValues[expectedCustomKey]);

            // Assert - the values from the automatic update should still be there
            Assert.True(instanceAfterDataUpdate.DataValues.ContainsKey(expectedKey));
            Assert.Equal(expectedValue, instanceAfterDataUpdate.DataValues[expectedKey]);

            TestDataUtil.DeleteInstanceAndData(org, app, 1337, new Guid(instanceGuid));
        }

        [Fact]
        public async Task Data_Get_NoInstanceReferences_ObjectSucessfullyPrefilledCalculatedAndReturned()
        {
            // Arrange
            string org = "ttd";
            string app = "presentationfields-app";
            string expectedPrefillValue = "Sophie Salt";
            string expectedCalculatedValue = "calculatedValue";
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/v1/data?dataType=default";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            string responseContent = await res.Content.ReadAsStringAsync();
            Mocks.Apps.Ttd.PresentationTextsApp.Skjema dataObject = JsonConvert.DeserializeObject<Mocks.Apps.Ttd.PresentationTextsApp.Skjema>(responseContent);
            string actualPrefillValue = dataObject?.OpplysningerOmArbeidstakerengrp8819?.Arbeidsforholdgrp8856?.AnsattSammenhengendeAnsattAnsettelsedatadef33267?.value;
            string actualCalculatedValue = dataObject?.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.IdentifikasjonsnummerKravdatadef33317?.value;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.NotNull(actualPrefillValue);
            Assert.NotNull(actualCalculatedValue);
            Assert.Equal(expectedPrefillValue, actualPrefillValue);
            Assert.Equal(expectedCalculatedValue, actualCalculatedValue);
        }

        [Fact]
        public async Task Data_Post_NoInstanceReferences_CalculationsRunAndDataReturned()
        {
            // Arrange
            string org = "ttd";
            string app = "model-validation";
            decimal expected = 1001;

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string requestUri = $"/{org}/{app}/v1/data?dataType=default";
            string requestBody = "{\"skjemanummer\":\"1472\",\"spesifikasjonsnummer\":\"9812\",\"blankettnummer\":\"AFP-01\",\"tittel\":\"ArbeidsgiverskjemaAFP\",\"gruppeid\":\"8818\",\"OpplysningerOmArbeidstakerengrp8819\":{\"Arbeidsforholdgrp8856\":{\"AnsattSammenhengendeAnsattAnsettelsedatadef33267\":{\"value\":\"SophieSalt\",\"orid\":\"33267\"},},\"Skjemainstansgrp8854\":{\"Journalnummerdatadef33316\":{\"value\":\"1000\"}}}}";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            // Act
            HttpResponseMessage res = await client.SendAsync(httpRequestMessage);

            string responseContent = await res.Content.ReadAsStringAsync();
            Mocks.Apps.ttd.model_validation.Skjema dataObject = JsonConvert.DeserializeObject<Mocks.Apps.ttd.model_validation.Skjema>(responseContent);
            decimal? actual = dataObject?.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value;

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.NotNull(actual);
            Assert.Equal(expected, actual);
        }
    }
}
