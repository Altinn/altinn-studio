using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services;

using Microsoft.AspNetCore.Mvc.Testing;

using Moq;

using Xunit;

namespace Altinn.Platform.Authentication.Tests.Services
{
    public class EFormidlingAccessValidatorTest
    {
        private readonly Mock<IAccessTokenValidator> _validatorMock;

        /// <summary>
        /// Initialises a new instance of the <see cref="EFormidlingAccessValidatorTest"/> class with the given WebApplicationFactory.
        /// </summary>
        public EFormidlingAccessValidatorTest()
        {
            _validatorMock = new Mock<IAccessTokenValidator>();
        }

        /// <summary>
        /// Scenario : Validate token called with valid token
        /// Expected : Issuer is extracted from the token and appended to the response.
        /// Success Result: Inspection response contains correct issues, and active = true
        /// </summary>
        [Fact]
        public async Task ValidateToken_ValidToken_ActiveTrue()
        {
            // Arrrange
            string expectedIssuer = "studio";

            string accessToken = JwtTokenMock.GenerateAccessToken("studio", "studio.designer", TimeSpan.FromMinutes(2));

            EFormidlingAccessValidator sut = new EFormidlingAccessValidator(GetMockObjectWithResponse(true));

            // Act
            IntrospectionResponse actual = await sut.ValidateToken(accessToken);

            // Assert
            Assert.True(actual.Active);
            Assert.Equal(expectedIssuer, actual.Iss);
        }

        /// <summary>
        /// Scenario : Validate token called with an invalid token
        /// Expected : No further manipulation of the response object in service
        /// Success Result: Inspection response contains active = false and no issuer.
        /// </summary>
        [Fact]
        public async Task ValidateToken_InvalidToken_ActiveFalse()
        {
            // Arrrange
            string accessToken = "invalidRandomToken";

            EFormidlingAccessValidator sut = new EFormidlingAccessValidator(GetMockObjectWithResponse(false));

            // Act
            IntrospectionResponse actual = await sut.ValidateToken(accessToken);

            // Assert
            Assert.False(actual.Active);
        }

        private IAccessTokenValidator GetMockObjectWithResponse(bool response)
        {
            _validatorMock
                .Setup(vm => vm.Validate(It.IsAny<string>()))
                .ReturnsAsync(response);

            return _validatorMock.Object;
        }
    }
}
