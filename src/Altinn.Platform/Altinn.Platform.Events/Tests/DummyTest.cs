using System;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Tests
{
    public class DummyTest
    {
        
        [Fact]
        public void TestName()
        {
            Console.WriteLine("Første test");
            Assert.True(true);
        }
    }
}