using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;

using Altinn.Platform.Profile.Models;
using Altinn.Platform.Receipt.Helpers;
using Altinn.Platform.Receipt.IntegrationTest.Mocks;
using Altinn.Platform.Receipt.Model;
using Altinn.Platform.Receipt.Services.Interfaces;
using Altinn.Platform.Receipt.Test.Testdata;
using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;
using Newtonsoft.Json;
using Tests.Mocks;
using Xunit;

namespace Altinn.Platform.Receipt.Test
{
    public partial class IntegrationTests
    {
        public class ReceiptController : IClassFixture<WebApplicationFactory<Startup>>
        {
            private readonly WebApplicationFactory<Startup> _factory;
            private readonly Mock<IRegister> _registerMock;
            private readonly Mock<IStorage> _storageMock;
            private readonly Mock<IProfile> _profileMock;
            private readonly string BasePath = "/receipt/api/v1/";

            /// <summary>
            /// Initialises a new instance of the <see cref="ReceiptController"/> class with the given WebApplicationFactory.
            /// </summary>
            /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
            public ReceiptController(WebApplicationFactory<Startup> factory)
            {
                _factory = factory;
                _registerMock = new Mock<IRegister>();
                _storageMock = new Mock<IStorage>();
                _profileMock = new Mock<IProfile>();
            }


            [Fact]
            public async void GetCurrentUser_TC01_AuthenticatedUser()
            {
                _profileMock
               .Setup(p => p.GetUser(It.IsAny<int>()))
               .ReturnsAsync(UserProfiles.User1);

                HttpClient client = GetTestClient(_registerMock, _storageMock, _profileMock);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GetUserToken(3));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = $"{BasePath}users/current";

                HttpResponseMessage response = await client.GetAsync(url);
                UserProfile actual = JsonConvert.DeserializeObject<UserProfile>(await response.Content.ReadAsStringAsync());


                Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
                Assert.IsType<UserProfile>(actual);
            }

            [Fact]
            public async void GetCurrentUser_TC02_MissingUserClaim()
            {
                HttpClient client = GetTestClient(_registerMock, _storageMock, _profileMock);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GetUserToken(-1));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = $"{BasePath}users/current";

                HttpResponseMessage response = await client.GetAsync(url);
                Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
            }
            
            [Fact]
            public async void GetCurrentUser_TC03_ServiceThrowsException()
            {
                _profileMock
                 .Setup(p => p.GetUser(It.IsAny<int>()))
                 .Throws(new PlatformHttpException(new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.Forbidden }));

                HttpClient client = GetTestClient(_registerMock, _storageMock, _profileMock);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GetUserToken(3));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = $"{BasePath}users/current";

                HttpResponseMessage response = await client.GetAsync(url);
                Assert.Equal(System.Net.HttpStatusCode.Forbidden, response.StatusCode);
            }

            [Fact]
            public async void GetInstanceIncludeParty_TC01_IncludePartyFalse()
            {
                int instanceOwnerId = 123456;
                Guid instanceGuid = new Guid();
                bool includeParty = false;

                _registerMock.Setup(r =>
                r.GetParty(It.IsAny<int>()))
                    .ReturnsAsync(Parties.Party1);

                _storageMock.Setup(s =>
                s.GetInstance(It.IsAny<int>(), It.IsAny<Guid>()))
                    .ReturnsAsync(Instances.Instance1);

                HttpClient client = GetTestClient(_registerMock, _storageMock, _profileMock);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GetUserToken(3));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = $"{BasePath}instances/{instanceOwnerId}/{instanceGuid}?includeParty={includeParty}";

                HttpResponseMessage response = await client.GetAsync(url);
                ExtendedInstance actual = JsonConvert.DeserializeObject<ExtendedInstance>(await response.Content.ReadAsStringAsync());

                Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
                Assert.Null(actual.Party);
                Assert.NotNull(actual.Instance);
                Assert.Equal("tdd/auth-level-3", actual.Instance.AppId);
            }
            
            [Fact]
            public async void GetInstanceIncludeParty_TC02_IncludePartyTrue()
            {
                int instanceOwnerId = 123456;
                Guid instanceGuid = new Guid();
                bool includeParty = true;

                _registerMock.Setup(r =>
                r.GetParty(It.IsAny<int>()))
                    .ReturnsAsync(Parties.Party1);

                _storageMock.Setup(s =>
                s.GetInstance(It.IsAny<int>(), It.IsAny<Guid>()))
                    .ReturnsAsync(Instances.Instance1);

                HttpClient client = GetTestClient(_registerMock, _storageMock, _profileMock);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GetUserToken(3));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = $"{BasePath}instances/{instanceOwnerId}/{instanceGuid}?includeParty={includeParty}";

                HttpResponseMessage response = await client.GetAsync(url);
                ExtendedInstance actual = JsonConvert.DeserializeObject<ExtendedInstance>(await response.Content.ReadAsStringAsync());

                Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
                Assert.NotNull(actual.Party);
                Assert.NotNull(actual.Instance);
                Assert.Equal("tdd/auth-level-3", actual.Instance.AppId);
                Assert.Equal(Parties.Party1.PartyTypeName, actual.Party.PartyTypeName);
            }

            [Fact]
            public async void GetInstanceIncludeParty_TC03_IncludePartyNotIcnluded()
            {
                int instanceOwnerId = 123456;
                Guid instanceGuid = new Guid();


                _registerMock.Setup(r =>
                r.GetParty(It.IsAny<int>()))
                    .ReturnsAsync(Parties.Party1);

                _storageMock.Setup(s =>
                s.GetInstance(It.IsAny<int>(), It.IsAny<Guid>()))
                    .ReturnsAsync(Instances.Instance1);

                HttpClient client = GetTestClient(_registerMock, _storageMock, _profileMock);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GetUserToken(3));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = $"{BasePath}instances/{instanceOwnerId}/{instanceGuid}";

                HttpResponseMessage response = await client.GetAsync(url);
                ExtendedInstance actual = JsonConvert.DeserializeObject<ExtendedInstance>(await response.Content.ReadAsStringAsync());

                Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
                Assert.Null(actual.Party);
                Assert.NotNull(actual.Instance);
                Assert.Equal("tdd/auth-level-3", actual.Instance.AppId);
            }

            [Fact]
            public async void GetInstanceIncludeParty_TC04_StorageThrowsException()
            {
                int instanceOwnerId = 123456;
                Guid instanceGuid = new Guid();

                _storageMock.Setup(s =>
                s.GetInstance(It.IsAny<int>(), It.IsAny<Guid>()))
                    .Throws(new PlatformHttpException(new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.InternalServerError }));

                HttpClient client = GetTestClient(_registerMock, _storageMock, _profileMock);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GetUserToken(3));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = $"{BasePath}instances/{instanceOwnerId}/{instanceGuid}";

                HttpResponseMessage response = await client.GetAsync(url);

                Assert.Equal(System.Net.HttpStatusCode.InternalServerError, response.StatusCode);
            }


            [Fact]
            public async void GetInstanceIncludeParty_TC05_RegisterThrowsException()
            {
                int instanceOwnerId = 123456;
                Guid instanceGuid = new Guid();
                bool includeParty = true;

                _registerMock.Setup(r =>
                r.GetParty(It.IsAny<int>()))
                 .Throws(new PlatformHttpException(new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.NotFound }));

                _storageMock.Setup(s =>
                s.GetInstance(It.IsAny<int>(), It.IsAny<Guid>()))
                    .ReturnsAsync(Instances.Instance1);

                HttpClient client = GetTestClient(_registerMock, _storageMock, _profileMock);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GetUserToken(3));
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                string url = $"{BasePath}instances/{instanceOwnerId}/{instanceGuid}?includeParty={includeParty}";

                HttpResponseMessage response = await client.GetAsync(url);
                Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
            }

            private string GetUserToken(int userId)
            {
                List<Claim> claims = new List<Claim>();
                string issuer = "www.altinn.no";

                if (userId != -1)
                {
                    claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.String, issuer));
                }


                claims.Add(new Claim(AltinnCoreClaimTypes.UserName, "UserOne", ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, (userId + 5000).ToString(), ClaimValueTypes.Integer32, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, issuer));
                claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, issuer));

                ClaimsIdentity identity = new ClaimsIdentity("mock");
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);
                string token = JwtTokenMock.GenerateToken(principal);

                return token;
            }

            private HttpClient GetTestClient(Mock<IRegister> registerMock, Mock<IStorage> storageMock, Mock<IProfile> profileMock)
            {

                string projectDir = Directory.GetCurrentDirectory();
                string configPath = Path.Combine($"{projectDir}", "appsettings.json");


                HttpClient client = _factory.WithWebHostBuilder(builder =>
                    {
                        builder.ConfigureTestServices(services =>
                        {
                            services.AddSingleton(registerMock.Object);
                            services.AddSingleton(storageMock.Object);
                            services.AddSingleton(profileMock.Object);
                            services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                        })
                        .ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });

                    }).CreateClient();


                return client;

            }
        }
    }
}
