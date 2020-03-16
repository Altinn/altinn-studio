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
using System.Collections;
using System.Linq;

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
                    services.AddSingleton<IInstanceEvent, InstanceEventAppSIMock>();
                    services.AddSingleton<IDSF, DSFMockSI>();
                    services.AddSingleton<IER, ERMockSI>();
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
                        case "task-validation":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.task_validation.AltinnApp>();
                            break;
                        case "platform-fails":
                            services.AddSingleton<IInstance, InstancePlatformFailsMock>();
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.platform_fails.AltinnApp>();
                            break;
                        case "complex-process":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.complex_process.App>();
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


        public static void AddAuthCookie(HttpRequestMessage requestMessage, string token, string xsrfToken = null)
        {
            requestMessage.Headers.Add("Cookie", Altinn.App.Services.Constants.General.RuntimeCookieName + "=" + token);
            if (xsrfToken != null)
            {
                requestMessage.Headers.Add("X-XSRF-TOKEN", xsrfToken);
            }
        }

        public static string GetXsrfCookieValue(HttpResponseMessage response)
        {
            System.Collections.Generic.IEnumerable<string> setCookieHeaders = response.Headers.GetValues("Set-Cookie");

            for (int i = 0; i < setCookieHeaders.Count(); i++)
            {
                if (setCookieHeaders.ElementAt(i).StartsWith("XSRF-TOKEN"))
                {
                    return setCookieHeaders.ElementAt(i).Substring(11).Split(";")[0];
                }
            }

            return null;
        }

        private static string GetAppPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Apps\", org + @"\", app + @"\");
        }
    }
}
