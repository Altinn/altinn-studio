using System.Collections.Generic;
using System.Reflection.Metadata;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace UnitTests
{
    public class ScopeAccessHandlerTest
    {
        private readonly IOptions<PepSettings> _pepSettings;
        private readonly ScopeAccessHandler _sah;

        public ScopeAccessHandlerTest()
        {
            _pepSettings = Options.Create(new PepSettings());
            _sah = new ScopeAccessHandler(new Mock<ILogger<ScopeAccessHandler>>().Object);
        }

        /// <summary>
        /// Test case: Valid scope claim is included in context.
        /// Expected: Context will succeed.
        /// </summary>
        [Fact]
        public async Task HandleAsync_ValidScope_ContextSuccess()
        {
            // Arrange 
            AuthorizationHandlerContext context = CreateAuthzHandlerContext("altinn:appdeploy");

            // Act
            await _sah.HandleAsync(context);

            // Assert
            Assert.True(context.HasSucceeded);
            Assert.False(context.HasFailed);
        }

        /// <summary>
        /// Test case: Invalid scope claim is included in context.
        /// Expected: Context will fail.
        /// </summary>
        [Fact]
        public async Task HandleAsync_InvalidScope_ContextFail()
        {
            // Arrange 
            AuthorizationHandlerContext context = CreateAuthzHandlerContext("altinn:invalid");

            // Act
            await _sah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
            Assert.True(context.HasFailed);
        }

        /// <summary>
        /// Test case: Empty scope claim is included in context.
        /// Expected: Context will fail.
        /// </summary>
        [Fact]
        public async Task HandleAsync_EmptyScope_ContextFail()
        {
            // Arrange 
            AuthorizationHandlerContext context = CreateAuthzHandlerContext(string.Empty);

            // Act
            await _sah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
            Assert.True(context.HasFailed);
        }

        private AuthorizationHandlerContext CreateAuthzHandlerContext(string scopeClaim)
        {
            ScopeAccessRequirement requirement = new ScopeAccessRequirement("altinn:appdeploy");

            ClaimsPrincipal user = new ClaimsPrincipal(
                new ClaimsIdentity(
                    new List<Claim>{
                        new Claim("urn:altinn:scope", scopeClaim, "string", "org"),
                        new Claim("urn:altinn:org", "brg", "string", "org")},
        "AuthenticationTypes.Federation"
                ));

            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                new Document()
            );
            return context;
        }
    }
}
