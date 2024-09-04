using System.Text.Json;
using FluentAssertions;

namespace Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

public class DynamicClassBuilderChatGptTests
{
    [Fact]
    public void CreateClassFromJson_ShouldCreateClassWithStringProperty()
    {
        string jsonString = "{\"Name\":\"John Doe\"}";
        JsonDocument jsonDocument = JsonDocument.Parse(jsonString);

        Type dynamicType = DynamicClassBuilder.CreateClassFromJson(jsonDocument);

        dynamicType.Should().NotBeNull();
        dynamicType.GetProperty("Name").Should().NotBeNull();
        dynamicType.GetProperty("Name")!.PropertyType.Should().Be(typeof(string));

        // Deserialize and assert
        var deserializedObject = JsonSerializer.Deserialize(jsonString, dynamicType);
        var nameProperty = dynamicType.GetProperty("Name")!.GetValue(deserializedObject);
        nameProperty.Should().Be("John Doe");
    }

    [Fact]
    public void CreateClassFromJson_ShouldCreateClassWithNumberProperty()
    {
        string jsonString = "{\"Age\":30}";
        JsonDocument jsonDocument = JsonDocument.Parse(jsonString);

        Type dynamicType = DynamicClassBuilder.CreateClassFromJson(jsonDocument);

        dynamicType.Should().NotBeNull();
        dynamicType.GetProperty("Age").Should().NotBeNull();
        dynamicType.GetProperty("Age")!.PropertyType.Should().Be(typeof(double?));

        // Deserialize and assert
        var deserializedObject = JsonSerializer.Deserialize(jsonString, dynamicType);
        var ageProperty = dynamicType.GetProperty("Age")!.GetValue(deserializedObject);
        ageProperty.Should().Be(30.0); // Note: System.Text.Json deserializes numbers as double by default
    }

    [Fact]
    public void CreateClassFromJson_ShouldCreateClassWithBooleanProperty()
    {
        string jsonString = "{\"IsEmployed\":true}";
        JsonDocument jsonDocument = JsonDocument.Parse(jsonString);

        Type dynamicType = DynamicClassBuilder.CreateClassFromJson(jsonDocument);

        dynamicType.Should().NotBeNull();
        dynamicType.GetProperty("IsEmployed").Should().NotBeNull();
        dynamicType.GetProperty("IsEmployed")!.PropertyType.Should().Be(typeof(bool?));

        // Deserialize and assert
        var deserializedObject = JsonSerializer.Deserialize(jsonString, dynamicType);
        var isEmployedProperty = dynamicType.GetProperty("IsEmployed")!.GetValue(deserializedObject);
        isEmployedProperty.Should().Be(true);
    }

    [Fact]
    public void CreateClassFromJson_ShouldCreateClassWithNestedObjectProperty()
    {
        string jsonString = "{\"Address\":{\"Street\":\"123 Main St\",\"City\":\"Anytown\"}}";
        JsonDocument jsonDocument = JsonDocument.Parse(jsonString);

        Type dynamicType = DynamicClassBuilder.CreateClassFromJson(jsonDocument);

        dynamicType.Should().NotBeNull();
        dynamicType.GetProperty("Address").Should().NotBeNull();

        Type addressType = dynamicType.GetProperty("Address")!.PropertyType;
        addressType.GetProperty("Street").Should().NotBeNull();
        addressType.GetProperty("Street")!.PropertyType.Should().Be(typeof(string));
        addressType.GetProperty("City").Should().NotBeNull();
        addressType.GetProperty("City")!.PropertyType.Should().Be(typeof(string));

        // Deserialize and assert
        var deserializedObject = JsonSerializer.Deserialize(jsonString, dynamicType);
        var addressProperty = dynamicType.GetProperty("Address")!.GetValue(deserializedObject);
        var streetProperty = addressType.GetProperty("Street")!.GetValue(addressProperty);
        var cityProperty = addressType.GetProperty("City")!.GetValue(addressProperty);

        streetProperty.Should().Be("123 Main St");
        cityProperty.Should().Be("Anytown");
    }

    [Fact]
    public void CreateClassFromJson_ShouldCreateClassWithArrayProperty()
    {
        string jsonString = "{\"Numbers\":[1, 2, 3]}";
        JsonDocument jsonDocument = JsonDocument.Parse(jsonString);

        Type dynamicType = DynamicClassBuilder.CreateClassFromJson(jsonDocument);

        dynamicType.Should().NotBeNull();
        dynamicType.GetProperty("Numbers").Should().NotBeNull();
        dynamicType.GetProperty("Numbers")!.PropertyType.Should().Be(typeof(List<double?>));

        // Deserialize and assert
        var deserializedObject = JsonSerializer.Deserialize(jsonString, dynamicType);
        var numbersProperty = dynamicType.GetProperty("Numbers")!.GetValue(deserializedObject) as List<double?>;

        numbersProperty!.Should().NotBeNull();
        numbersProperty!.Should().BeEquivalentTo(new List<double?> { 1.0, 2.0, 3.0 });
    }

    [Fact]
    public void CreateClassFromJson_ShouldCreateClassWithNestedArrayObjectProperty()
    {
        string jsonString =
            "{\"Addresses\":[{\"Street\":\"123 Main St\",\"City\":\"Anytown\"},{\"Street\":\"456 Elm St\",\"City\":\"Othertown\"}]}";
        JsonDocument jsonDocument = JsonDocument.Parse(jsonString);

        Type dynamicType = DynamicClassBuilder.CreateClassFromJson(jsonDocument);

        dynamicType.Should().NotBeNull();
        dynamicType.GetProperty("Addresses").Should().NotBeNull();

        Type addressesType = dynamicType.GetProperty("Addresses")!.PropertyType;
        addressesType.Should().BeAssignableTo(typeof(List<>));

        Type addressItemType = addressesType.GetGenericArguments()[0];
        addressItemType.GetProperty("Street").Should().NotBeNull();
        addressItemType.GetProperty("Street")!.PropertyType.Should().Be(typeof(string));
        addressItemType.GetProperty("City").Should().NotBeNull();
        addressItemType.GetProperty("City")!.PropertyType.Should().Be(typeof(string));

        // Deserialize and assert
        var deserializedObject = JsonSerializer.Deserialize(jsonString, dynamicType);
        var addressesProperty =
            dynamicType.GetProperty("Addresses")!.GetValue(deserializedObject) as IEnumerable<object>;

        // ReSharper disable once PossibleMultipleEnumeration
        addressesProperty.Should().NotBeNull();

        // ReSharper disable once PossibleMultipleEnumeration
        foreach (var address in addressesProperty!)
        {
            var streetProperty = addressItemType.GetProperty("Street")!.GetValue(address);
            var cityProperty = addressItemType.GetProperty("City")!.GetValue(address);

            streetProperty.Should().NotBeNull();
            cityProperty.Should().NotBeNull();
        }
    }
}
