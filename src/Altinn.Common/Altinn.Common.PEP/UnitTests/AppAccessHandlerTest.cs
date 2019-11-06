using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Interfaces;
using Microsoft.AspNetCore.Http;
using Moq;
using System;
using Xunit;

namespace Altinn.Common.PEP.UnitTests
{
    public class AppAccessHandlerTest 
    {
        private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock;
        private readonly Mock<IAuthorization> _authorizationMock;
        private readonly AppAccessHandler _aah;

        public AppAccessHandlerTest()
        {
            _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            _authorizationMock = new Mock<IAuthorization>();
            _aah = new AppAccessHandler(_httpContextAccessorMock.Object, _authorizationMock.Object);
        }

        /// <summary>
        /// Test case: Send request and get respons
        /// Expected: HandleRequirementAsync will not fail
        /// </summary>
        [Fact]
        public void HandleRequirementAsync_TC01()
        {
            _aah.
        }
    }
}
