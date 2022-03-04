#nullable enable

using System;
using System.Text;

using Altinn.Platform.Register.Models;

using Xunit;

namespace Altinn.Platform.Register.Tests.UnitTests
{
    public class PersonLookupIdentifiersTests
    {
        [Fact]
        public void LastNameTest_ReadNotEncoded_ReturnsLiteral()
        {
            // Arrange
            var target = new PersonLookupIdentifiers
            {
                LastName = "hopla"
            };

            // Act
            var actual = target.LastName;

            // Asserts
            Assert.Equal("hopla", actual);
        }

        [Fact]
        public void LastNameTest_ReadEncoded_ReturnsDecoded()
        {
            // Arrange
            var bytes = Encoding.UTF8.GetBytes("Hørtfør");
            var base64 = Convert.ToBase64String(bytes);
            var target = new PersonLookupIdentifiers
            {
                LastName = base64
            };

            // Act
            var actual = target.LastName;

            // Asserts
            Assert.Equal("Hørtfør", actual);
        }
    }
}
