using System.Text.Json;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Testing;

/// <summary>
/// Implementation of IMockDataHelper for merging mock data with real service responses.
/// </summary>
public class MockDataHelper(Logger<MockDataHelper>? logger = null) : IMockDataHelper
{
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
    private readonly Logger<MockDataHelper>? _logger = logger;

    /// <inheritdoc />
    public UserProfile MergeUserProfile(UserProfile real, object? mockData)
    {
        return MergeObject(real, mockData);
    }

    /// <inheritdoc />
    public List<Party> MergeParties(List<Party> real, object? mockData)
    {
        if (mockData == null)
            return real;

        if (mockData is not object[] mockArray)
            return real;

        var result = new List<Party>(real);

        foreach (var mockParty in mockArray)
        {
            var mockPartyJson = JsonSerializer.Serialize(mockParty);
            using var mockPartyDoc = JsonDocument.Parse(mockPartyJson);

            if (
                mockPartyDoc.RootElement.TryGetProperty("partyId", out var partyIdElement)
                && partyIdElement.TryGetInt32(out var partyId)
            )
            {
                // Find existing party to merge
                var existingParty = result.FirstOrDefault(p => p.PartyId == partyId);
                if (existingParty != null)
                {
                    // Merge with existing party
                    var merged = MergeObject(existingParty, mockParty);
                    var index = result.IndexOf(existingParty);
                    result[index] = merged;
                }
                else
                {
                    // Create new party
                    var newParty = JsonSerializer.Deserialize<Party>(mockPartyJson, _jsonOptions);
                    if (newParty != null)
                    {
                        result.Add(newParty);
                    }
                }
            }
        }

        return result;
    }

    /// <inheritdoc />
    public ApplicationMetadata MergeApplicationMetadata(ApplicationMetadata real, object? mockData)
    {
        return MergeObject(real, mockData);
    }

    /// <inheritdoc />
    public List<Instance> MergeInstances(List<Instance> real, object? mockData)
    {
        if (mockData == null)
            return real;

        if (mockData is not object[] mockArray)
            return real;

        var result = new List<Instance>(real);

        foreach (var mockInstance in mockArray)
        {
            var mockInstanceJson = JsonSerializer.Serialize(mockInstance);
            using var mockInstanceDoc = JsonDocument.Parse(mockInstanceJson);

            if (
                mockInstanceDoc.RootElement.TryGetProperty("id", out var idElement)
                && idElement.ValueKind == JsonValueKind.String
            )
            {
                var instanceId = idElement.GetString();

                // Find existing instance to merge
                var existingInstance = result.FirstOrDefault(i => i.Id == instanceId);
                if (existingInstance != null)
                {
                    // Merge with existing instance
                    var merged = MergeObject(existingInstance, mockInstance);
                    var index = result.IndexOf(existingInstance);
                    result[index] = merged;
                }
                else
                {
                    // Create new instance
                    var newInstance = JsonSerializer.Deserialize<Instance>(mockInstanceJson, _jsonOptions);
                    if (newInstance != null)
                    {
                        result.Add(newInstance);
                    }
                }
            }
        }

        return result;
    }

    /// <inheritdoc />
    public T MergeObject<T>(T realObject, object? mockData)
        where T : class
    {
        if (mockData == null)
            return realObject;

        // Use the property-by-property approach for better type handling and nested object support
        return MergeObjectPropertyByProperty(realObject, mockData);
    }

    /// <summary>
    /// Merges mock data into a real object using property-by-property approach for better type safety.
    /// </summary>
    /// <typeparam name="T">The type of object to merge.</typeparam>
    /// <param name="realObject">The real object to merge into.</param>
    /// <param name="mockData">The mock data to merge from.</param>
    /// <returns>A new object with mock data merged over real data.</returns>
    private T MergeObjectPropertyByProperty<T>(T realObject, object? mockData)
        where T : class
    {
        try
        {
            // Create a copy by serializing and deserializing the real object
            var realJson = JsonSerializer.Serialize(realObject, _jsonOptions);
            var mutableCopy = JsonSerializer.Deserialize<T>(realJson, _jsonOptions);

            if (mutableCopy == null)
                return realObject;

            // Parse mock data as JsonElement to iterate through properties
            var mockJson = JsonSerializer.Serialize(mockData, _jsonOptions);
            using var mockDoc = JsonDocument.Parse(mockJson);

            // Try to set each property individually, ignoring failures
            MergePropertiesIndividually(mutableCopy, mockDoc.RootElement);

            return mutableCopy;
        }
        catch
        {
            return realObject;
        }
    }

    private void MergePropertiesIndividually<T>(T target, JsonElement mockElement)
    {
        if (mockElement.ValueKind != JsonValueKind.Object)
            return;

        var targetType = typeof(T);
        var properties = targetType.GetProperties(
            System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance
        );

        foreach (var property in properties)
        {
            if (!property.CanWrite)
                continue;

            var propertyName = _jsonOptions.PropertyNamingPolicy?.ConvertName(property.Name) ?? property.Name;

            if (mockElement.TryGetProperty(propertyName, out var mockValue))
            {
                try
                {
                    var convertedValue = ConvertJsonElementToPropertyType(
                        mockValue,
                        property.PropertyType,
                        property.GetValue(target)
                    );
                    if (convertedValue != null)
                    {
                        property.SetValue(target, convertedValue);
                    }
                }
                catch
                {
                    // Ignore individual property conversion failures
                }
            }
        }
    }

    private object? ConvertJsonElementToPropertyType(JsonElement jsonElement, Type targetType, object? currentValue)
    {
        try
        {
            if (targetType.IsGenericType && targetType.GetGenericTypeDefinition() == typeof(Nullable<>))
            {
                targetType = Nullable.GetUnderlyingType(targetType) ?? targetType;
            }

            return jsonElement.ValueKind switch
            {
                JsonValueKind.String when targetType == typeof(string) => jsonElement.GetString(),
                JsonValueKind.Number when targetType == typeof(int) => jsonElement.GetInt32(),
                JsonValueKind.Number when targetType == typeof(long) => jsonElement.GetInt64(),
                JsonValueKind.Number when targetType == typeof(decimal) => jsonElement.GetDecimal(),
                JsonValueKind.Number when targetType == typeof(double) => jsonElement.GetDouble(),
                JsonValueKind.True or JsonValueKind.False when targetType == typeof(bool) => jsonElement.GetBoolean(),
                JsonValueKind.String when targetType == typeof(bool) => bool.TryParse(
                    jsonElement.GetString(),
                    out var b
                )
                    ? b
                    : null,
                JsonValueKind.Object when targetType.IsClass => MergeNestedObject(
                    jsonElement,
                    targetType,
                    currentValue
                ),
                _ => null,
            };
        }
        catch
        {
            return null;
        }
    }

    private object? MergeNestedObject(JsonElement mockElement, Type targetType, object? currentValue)
    {
        try
        {
            if (currentValue != null)
            {
                // Use the generic MergeObject method to properly merge nested objects
                var mockObject = JsonSerializer.Deserialize(mockElement.GetRawText(), typeof(object), _jsonOptions);
                var mergedResult = MergeObject((dynamic)currentValue, mockObject);
                return mergedResult;
            }
            else
            {
                // No current value, just deserialize the mock data
                return JsonSerializer.Deserialize(mockElement.GetRawText(), targetType, _jsonOptions);
            }
        }
        catch
        {
            return null;
        }
    }
}
