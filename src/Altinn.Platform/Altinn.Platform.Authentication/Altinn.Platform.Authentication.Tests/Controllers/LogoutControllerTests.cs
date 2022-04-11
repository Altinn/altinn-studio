using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Controllers;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services;
using Altinn.Platform.Authentication.Services.Interfaces;
using Altinn.Platform.Authentication.Tests.Fakes;
using Altinn.Platform.Authentication.Tests.Mocks;
using Altinn.Platform.Profile.Models;
using AltinnCore.Authentication.JwtCookie;
using App.IntegrationTests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Authentication.Tests.Controllers
{
    /// <summary>
    /// Represents a collection of unit test with all integration tests of the <see cref="OpenIdController"/> class.
    /// </summary>
    public class LogoutControllerTests : IClassFixture<WebApplicationFactory<LogoutController>>
    {
        private readonly WebApplicationFactory<LogoutController> _factory;
  
        private readonly Mock<IUserProfileService> _userProfileService;
        private readonly Mock<IOrganisationsService> _organisationsService;
        private readonly Mock<ISblCookieDecryptionService> _cookieDecryptionService;

        /// <summary>
        /// Initialises a new instance of the <see cref="OpenIdControllerTests"/> class with the given WebApplicationFactory.
        /// </summary>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
        public LogoutControllerTests(WebApplicationFactory<LogoutController> factory)
        {
            _factory = factory;
            _userProfileService = new Mock<IUserProfileService>();
            _organisationsService = new Mock<IOrganisationsService>();
            _cookieDecryptionService = new Mock<ISblCookieDecryptionService>();
        }

        /// <summary>
        /// Validates that a user that is not authenticated is forward to SBL logout (not possible to identify any issorg)
        /// </summary>
        [Fact]
        public async Task Logout_TimedOut_RedirectToSBL()
        {
            // Arrange
            HttpClient client = GetTestClient(_cookieDecryptionService.Object, _userProfileService.Object);

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/logout");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.Found, response.StatusCode);

            IEnumerable<string> values;
            if (response.Headers.TryGetValues("location", out values))
            {
                Assert.Equal("http://localhost/ui/authentication/logout", values.First());
            }
        }

        /// <summary>
        /// Validates that a user that is not authenticated is forward to SBL logout (not possible to identify any issorg)
        /// </summary>
        [Fact]
        public async Task Logout_LogedIn_RedirectToSBL()
        {
            string token = PrincipalUtil.GetToken(1337, null);

            HttpClient client = GetTestClient(_cookieDecryptionService.Object, _userProfileService.Object);

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/logout");
            SetupUtil.AddAuthCookie(requestMessage, token);

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.Found, response.StatusCode);

            IEnumerable<string> values;
            if (response.Headers.TryGetValues("location", out values))
            {
                Assert.Equal("http://localhost/ui/authentication/logout", values.First());
            }
        }

        /// <summary>
        /// Validates that a user that is not authenticated is forward to SBL logout (not possible to identify any issorg)
        /// </summary>
        [Fact]
        public async Task Logout_LogedIn_RedirectToIss()
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";
            claims.Add(new Claim("originaliss", "uidp", ClaimValueTypes.String, issuer));

            string token = PrincipalUtil.GetToken(1337, claims);

            HttpClient client = GetTestClient(_cookieDecryptionService.Object, _userProfileService.Object);

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/logout");
            SetupUtil.AddAuthCookie(requestMessage, token);

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.Found, response.StatusCode);

            IEnumerable<string> values;
            if (response.Headers.TryGetValues("location", out values))
            {
                Assert.Equal("https://idporten.azurewebsites.net/api/v1/logout", values.First());
            }

            if (response.Headers.TryGetValues("Set-Cookie", out values))
            {
                Assert.Equal(".ASPXAUTH=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=localhost; path=/; secure; httponly", values.First());
                Assert.Equal("AltinnStudioRuntime=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=localhost; path=/; secure; httponly", values.Last());
            }
        }

        /// <summary>
        /// Frontchannel logout
        /// </summary>
        [Fact]
        public async Task Logout_FrontChannelOK()
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";
            claims.Add(new Claim("originaliss", "uidp", ClaimValueTypes.String, issuer));

            string token = PrincipalUtil.GetToken(1337, claims);

            HttpClient client = GetTestClient(_cookieDecryptionService.Object, _userProfileService.Object);

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/frontchannel_logout");
            SetupUtil.AddAuthCookie(requestMessage, token);

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

            IEnumerable<string> values;

            if (response.Headers.TryGetValues("Set-Cookie", out values))
            {
                Assert.Equal(".ASPXAUTH=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=localhost; path=/; secure; httponly", values.First());
                Assert.Equal("AltinnStudioRuntime=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=localhost; path=/; secure; httponly", values.Last());
            }
        }

        private HttpClient GetTestClient(ISblCookieDecryptionService cookieDecryptionService, IUserProfileService userProfileService, bool enableOidc = false, bool forceOidc = false, string defaultOidc = "altinn")
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                string configPath = GetConfigPath();
                builder.ConfigureAppConfiguration((context, conf) =>
                {
                    conf.AddJsonFile(configPath);
                });

                var configuration = new ConfigurationBuilder()
                  .AddJsonFile(configPath)
                  .Build();

                configuration.GetSection("GeneralSettings:EnableOidc").Value = enableOidc.ToString();
                configuration.GetSection("GeneralSettings:ForceOidc").Value = forceOidc.ToString();
                configuration.GetSection("GeneralSettings:DefaultOidcProvider").Value = defaultOidc;

                IConfigurationSection generalSettingSection = configuration.GetSection("GeneralSettings");

                builder.ConfigureTestServices(services =>
                {
                    services.Configure<GeneralSettings>(generalSettingSection);
                    services.AddSingleton(cookieDecryptionService);
                    services.AddSingleton(userProfileService);
                    services.AddSingleton<IOrganisationsService, OrganisationsServiceMock>();
                    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>();
                    services.AddSingleton<IJwtSigningCertificateProvider, JwtSigningCertificateProviderStub>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    services.AddSingleton<ISigningKeysResolver, SigningKeyResolverStub>();
                    services.AddSingleton<IEnterpriseUserAuthenticationService, EnterpriseUserAuthenticationServiceMock>();
                    services.AddSingleton<IOidcProvider, OidcProviderServiceMock>();
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            return client;
        }

        private static string GetConfigPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(AuthenticationControllerTests).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../appsettings.json");
        }
    }
}
