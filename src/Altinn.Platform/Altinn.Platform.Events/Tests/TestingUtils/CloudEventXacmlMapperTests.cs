using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Events.Authorization;
using Altinn.Platform.Events.Models;
using AltinnCore.Authentication.Constants;
using Xunit;

namespace Altinn.Platform.Events.Tests.TestingUtils
{
    /// <summary>
    /// /
    /// </summary>
    public class CloudEventXacmlMapperTests
    {
        /// <summary>
        /// Test creation of single event XACML event
        /// </summary>
        [Fact]
        public void CreateSingleEventRequest()
        {
            // Arrange
            ClaimsPrincipal principal = GetPrincipal(1, 1);

            List<CloudEvent> cloudEvents = new List<CloudEvent>();
            CloudEvent cloudEvent = new CloudEvent()
            {
                Source = new Uri("https://skd.apps.altinn.no/skd/skattemelding/instances/1234324/6fb3f738-6800-4f29-9f3e-1c66862656cd"),
                Subject = "/party/1234324"
            };

            cloudEvents.Add(cloudEvent);

            // Act
            XacmlJsonRequestRoot xacmlJsonProfile = CloudEventXacmlMapper.CreateMultiDecisionRequest(principal, cloudEvents);

            // Assert.
            Assert.NotNull(xacmlJsonProfile);
            Assert.Single(xacmlJsonProfile.Request.Resource);
            Assert.Single(xacmlJsonProfile.Request.Action);
            Assert.Single(xacmlJsonProfile.Request.AccessSubject);
        }

        /// <summary>
        /// Test creaton of one request
        /// </summary>
        [Fact]
        public void CreateSingleEventRequestForConsumer()
        {
            CloudEvent cloudEvent = new CloudEvent()
            {
                Source = new Uri("https://skd.apps.altinn.no/skd/skattemelding/instances/1234324/6fb3f738-6800-4f29-9f3e-1c66862656cd"),
                Subject = "/party/1234324"
            };

            // Act
            XacmlJsonRequestRoot xacmlJsonProfile = CloudEventXacmlMapper.CreateDecisionRequest(cloudEvent, "/party/2");

            // Assert.
            Assert.NotNull(xacmlJsonProfile);
            Assert.Single(xacmlJsonProfile.Request.Resource);
            Assert.Single(xacmlJsonProfile.Request.Action);
            Assert.Single(xacmlJsonProfile.Request.AccessSubject);
        }

        private static ClaimsPrincipal GetPrincipal(int userId, int partyId)
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, "UserOne", ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, partyId.ToString(), ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "2", ClaimValueTypes.Integer32, issuer));

            ClaimsIdentity identity = new ClaimsIdentity("mock");
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            return principal;
        }
    }
}
