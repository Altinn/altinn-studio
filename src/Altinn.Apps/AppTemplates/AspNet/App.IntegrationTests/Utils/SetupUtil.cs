using Altinn.App.Common.Interface;
using Altinn.App.IntegrationTests;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn;
using App.IntegrationTests.Mocks.Services;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;

namespace App.IntegrationTestsRef.Utils
{
    public static class SetupUtil
    {
        public static HttpClient GetTestClient(CustomWebApplicationFactory<Altinn.App.Startup> factory, string org, string app)
        {
            HttpClient client = factory.WithWebHostBuilder(builder =>
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


        private static string GetAppPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Apps\", org + @"\", app + @"\");
        }
    }
}
