using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.TestingControllers
{
    public class DatamodelsControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/designer/api";

        public DatamodelsControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Scenario: Post a Json Schema
        /// </summary>
        [Fact]
        public async void Put_Updatemodel_Ok()
        {
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?filepath=5245/41111/41111";

            JsonSchema testData = LoadTestData("Designer.Tests._TestData.Model.JsonSchema.melding-1603-12392.json");

            var serializer = new JsonSerializer();
            JsonValue toar = serializer.Serialize(testData);

            string requestBody = toar.ToString();
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData)
            {
                Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
            };

            await AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async void Get_Updatemodel_Ok()
        {
            HttpClient client = GetTestClient();

            string dataPathWithData = $"{_versionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?filepath=5245/41111/41111";
   
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData)
            {
            };

            await AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responsestring = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private HttpClient GetTestClient()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.CodeBase).LocalPath);

            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((context, conf) =>
                {
                    conf.AddJsonFile("appsettings.json");
                });

                var configuration = new ConfigurationBuilder()
                    .AddJsonFile("appsettings.json")
                    .Build();

                configuration.GetSection("ServiceRepositorySettings:RepositoryLocation").Value = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

                IConfigurationSection serviceRepositorySettingSection = configuration.GetSection("ServiceRepositorySettings");

                builder.ConfigureTestServices(services =>
                {
                    services.Configure<ServiceRepositorySettings>(serviceRepositorySettingSection);
                    services.AddSingleton<IGitea, IGiteaMock>();
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            return client;
        }

        private JsonSchema LoadTestData(string resourceName)
        {
            Assembly assembly = typeof(DatamodelsControllerTests).GetTypeInfo().Assembly;
            using Stream resource = assembly.GetManifestResourceStream(resourceName);

            if (resource == null)
            {
                throw new InvalidOperationException("Unable to find test data embedded in the test assembly.");
            }

            using StreamReader streamReader = new StreamReader(resource);
            JsonValue jsonValue = JsonValue.Parse(streamReader);
            return new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
        }

        private async Task AddAuthenticateAndAuthAndXsrFCookieToRequest(HttpClient client, HttpRequestMessage message)
        {
            string loginUrl = $"/Login";
            HttpRequestMessage httpRequestMessageLogin = new HttpRequestMessage(HttpMethod.Get, loginUrl)
            {
            };

            HttpResponseMessage loginResponse = await client.SendAsync(httpRequestMessageLogin);
            IEnumerable<string> cookies = loginResponse.Headers.GetValues("Set-Cookie");

            string xsrfUrl = $"/User/Current";
            HttpRequestMessage httpRequestMessageXsrf = new HttpRequestMessage(HttpMethod.Get, xsrfUrl)
            {
            };
            SetAltinnStudiCookieFromResponseHeader(httpRequestMessageXsrf, cookies);

            HttpResponseMessage xsrfResponse = await client.SendAsync(httpRequestMessageXsrf);

            IEnumerable<string> xsrfcookies = xsrfResponse.Headers.GetValues("Set-Cookie");
            string xsrfToken = GetXsrfTokenFromCookie(xsrfcookies);
            SetAltinnStudiCookieFromResponseHeader(message, cookies, xsrfToken);
        }

        private string GetXsrfTokenFromCookie(IEnumerable<string> setCookieHeader)
        {
            foreach (string singleCookieHeader in setCookieHeader)
            {
                string[] cookies = singleCookieHeader.Split(',');

                foreach (string cookie in cookies)
                {
                    string[] cookieSettings = cookie.Split(";");

                    if (cookieSettings[0].StartsWith("XSRF-TOKEN"))
                    {
                       return cookieSettings[0].Replace("XSRF-TOKEN" + "=", string.Empty);
                    }
                }
            }

            return null;
        }

        private void SetAltinnStudiCookieFromResponseHeader(HttpRequestMessage requestMessage, IEnumerable<string> setCookieHeader, string xsrfToken = null)
        {
            foreach (string singleCookieHeader in setCookieHeader)
            {
                string[] cookies = singleCookieHeader.Split(',');

                foreach (string cookie in cookies)
                {
                    string[] cookieSettings = cookie.Split(";");

                    if (cookieSettings[0].StartsWith(Altinn.Studio.Designer.Constants.General.DesignerCookieName))
                    {
                        AddAuthCookie(requestMessage, cookieSettings[0].Replace(Altinn.Studio.Designer.Constants.General.DesignerCookieName + "=", string.Empty), xsrfToken);
                    }
                }
            }
        }

        private void AddAuthCookie(HttpRequestMessage requestMessage, string token, string xsrfToken = null)
        {
            requestMessage.Headers.Add("Cookie", Altinn.Studio.Designer.Constants.General.DesignerCookieName + "=" + token);
            if (xsrfToken != null)
            {
                requestMessage.Headers.Add("X-XSRF-TOKEN", xsrfToken);
            }
        }
    }
}
