using System;

using Altinn.App.Common.Helpers.Extensions;

using Xunit;

namespace Altinn.App.IntegrationTests.CommonTests.Helpers.Extensions
{
    public class StringExtensionsTests
    {
        [Fact]
        public void AsFileName_InputHasNoInvalidCharacters_ReturnsSameFilename()
        {
            // Arrange
            string inputFilename = "noinvalidcharacters.txt";

            // Act
            string cleanFilename = inputFilename.AsFileName();

            // Assert
            Assert.Equal(inputFilename, cleanFilename);
        }

        [Fact]
        public void AsFileName_InputHasInvalidCharacters_ExceptionsEnabled_ThrowsException()
        {
            // Arrange
            string inputFilename = "noinvalid\\characters.txt";

            ArgumentOutOfRangeException actualException = null;

            // Act
            try
            {
                string cleanFilename = inputFilename.AsFileName();
            }
            catch (ArgumentOutOfRangeException argex)
            {
                actualException = argex;
            }

            // Assert
            Assert.NotNull(actualException);
        }

        [Fact]
        public void AsFileName_InputHasInvalidCharacters_ExceptionsDisabled_ReturnsValidFilename()
        {
            // Arrange
            string inputFilename = "noinvalid\\characters.txt";

            // Act
            string cleanFilename = inputFilename.AsFileName(false);

            // Assert
            Assert.Equal("noinvalid_characters.txt", cleanFilename);
        }

        [Fact]
        public void AsFileName_InputIsEmpty_ReturnsEmpty()
        {
            // Arrange
            string inputFilename = " ";

            // Act
            string cleanFilename = inputFilename.AsFileName(false);

            // Assert
            Assert.Equal(" ", cleanFilename);
        }
    }
}
