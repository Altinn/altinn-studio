using Altinn.App.IntegrationTests;
using Altinn.App.IntegrationTests.Mocks.Authentication;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Platform.Authentication.Maskinporten;
using AltinnCore.Authentication.JwtCookie;
using App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn;
using App.IntegrationTests.Mocks.Apps.tdd.custom_validation;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTestsRef.Mocks.Services;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System;
using System.IO;
using System.Net.Http;

namespace App.IntegrationTestsRef.Utils
{
    public static class SetupUtil
    {
        public static HttpClient GetTestClient(
            CustomWebApplicationFactory<Altinn.App.Startup> factory,
            string org,
            string app)
        {
            HttpClient client = factory.WithWebHostBuilder(builder =>
            {

                string path = GetAppPath(org, app);

                builder.ConfigureAppConfiguration((context, conf) =>
                {
                    conf.AddJsonFile(path + "appsettings.json");
                });

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
                    services.AddSingleton<Altinn.Common.PEP.Interfaces.IPDP, PepWithPDPAuthorizationMockSI>();
                    services.AddSingleton<IApplication, ApplicationMockSI>();

                    services.AddTransient<IProfile, ProfileMockSI>();
                    services.AddSingleton<IValidation, ValidationAppSI>();
                    services.AddSingleton<IPDF, PDFMockSI>();

                    // Set up mock authentication so that not well known endpoint is used
                    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();

                    switch (app)
                    {
                        case "endring-av-navn":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
                            break;
                        case "custom-validation":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.custom_validation.AltinnApp>();
                            break;
                        default:
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
                            break;
                    }
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
