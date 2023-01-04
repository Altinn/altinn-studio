using System;
using Altinn.Studio.DataModeling.Utils;
using Xunit;

namespace DataModeling.Tests.Extensions
{
    public class UrlHelperTests
    {
        [Theory]
        [InlineData("model", "model")]
        [InlineData("model.json", "model")]
        [InlineData("/model.json", "model")]
        [InlineData("http://dev.altinn.studio/model.json", "model")]
        [InlineData("http://dev.altinn.studio/org/app/model.json", "model")]
        [InlineData("http://dev.altinn.studio/org/app/model.json/", "model")]
        public void GetName_ValidName_ShouldReturnName(string url, string expectedName)
        {
            Assert.Equal(expectedName, UrlHelper.GetName(url));
        }
    }
}
