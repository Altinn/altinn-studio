using Tests.SharedResources;
using Xunit;

namespace DataModeling.Tests;

public class SharedTest
{
    [Theory]
    [InlineData("Seres/schema_3124-39627.xsd")]
    public void TestLoad(string resource)
    {
        var someJsonSchema = SharedResourcesHelper.LoadTestDataAsString(resource);
    }
}
