using System;
using Xunit;

namespace Tests
{
    /// <summary>
    /// Idiottest
    /// </summary>
    public class DummyTest
    {
        /// <summary>
        /// Idiottest
        /// </summary>
        [Fact]
        public void TestName()
        {
            Console.WriteLine("Første test");
            Assert.True(true);
        }
    }
}