using FluentAssertions;

namespace Altinn.FileAnalyzers.Tests
{
    public class CanaryTests
    {
        [Fact]
        public void Pip()
        {
            true.Should().BeTrue();
        }
    }
}