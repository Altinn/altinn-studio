using Altinn.App.Clients.Fiks.Extensions;

namespace Altinn.App.Clients.Fiks.Tests.Extensions;

public class TypeExtensionsTest
{
    [Theory]
    [InlineData(typeof(TestRecord), "Name", ExpectedResult.Found)]
    [InlineData(typeof(TestRecord), "Age", ExpectedResult.Found)]
    [InlineData(typeof(TestRecord), "Address", ExpectedResult.Found)]
    [InlineData(typeof(TestRecord), "Address.Street", ExpectedResult.Found)]
    [InlineData(typeof(TestRecord), "Address.City", ExpectedResult.Found)]
    [InlineData(typeof(TestRecord), "Address.ZipCode", ExpectedResult.NotFound)]
    [InlineData(typeof(TestRecord), "NonExistent", ExpectedResult.NotFound)]
    [InlineData(typeof(TestRecord), "Address.Street.Name", ExpectedResult.NotFound)]
    [InlineData(typeof(AddressRecord), "Street", ExpectedResult.Found)]
    [InlineData(typeof(AddressRecord), "City", ExpectedResult.Found)]
    [InlineData(typeof(AddressRecord), "Country", ExpectedResult.NotFound)]
    [InlineData(typeof(TestRecord), null, ExpectedResult.NotFound)]
    [InlineData(null, "Name", ExpectedResult.NotFound)]
    public void HasPublicPropertyPath_BehavesAsExpected(Type? type, string? propertyPath, ExpectedResult expected)
    {
        bool result = type.HasPublicPropertyPath(propertyPath);

        if (expected == ExpectedResult.Found)
            Assert.True(result);
        else
            Assert.False(result);
    }

    private record TestRecord(string Name, int Age, AddressRecord Address);

    private record AddressRecord(string Street, string City);

    public enum ExpectedResult
    {
        Found,
        NotFound,
    }
}
