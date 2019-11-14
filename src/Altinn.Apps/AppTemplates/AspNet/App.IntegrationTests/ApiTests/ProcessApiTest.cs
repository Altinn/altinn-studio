using Altinn.App.Common.Interface;
using Altinn.App.IntegrationTests;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Xunit;

namespace App.IntegrationTests.ApiTests
{
    public class ProcessApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public ProcessApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Proceess_Get_OK()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = GetTestClient("tdd","endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713/process")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            ProcessState processState= (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

          
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("formfilling", processState.CurrentTask.ElementId);
        }


        private HttpClient GetTestClient(string org, string app)
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {

                string path = GetAppPath(org, app);

                var configuration = new ConfigurationBuilder()
                .AddJsonFile(path + "appsettings.json")
                .Build();

                configuration.GetSection("AppSettings:AppBasePath").Value = path;

                IConfigurationSection appSettingSection = configuration.GetSection("AppSettings");


                builder.ConfigureTestServices(services =>
                {
                    services.Configure<AppSettings>(appSettingSection);

                    services.AddSingleton<IInstance, InstanceMockSI>();
                    services.AddSingleton<IData, DataMockSI>();
                    services.AddSingleton<IRegister, RegisterMockSI>();

                    services.AddSingleton<Altinn.Common.PEP.Interfaces.IPDP, PepAuthorizationMockSI>();
                    services.AddSingleton<IApplication, ApplicationMockSI>();

                    services.AddSingleton<IAltinnApp, AltinnApp>();

                });
            })
            .CreateClient();

            return client;
        }


        private string GetAppPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Apps\", org + @"\", app + @"\");
        }

    }
}
