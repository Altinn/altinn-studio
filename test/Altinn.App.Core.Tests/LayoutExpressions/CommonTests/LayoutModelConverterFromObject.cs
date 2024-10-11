using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;

namespace Altinn.App.Core.Tests.LayoutExpressions.CommonTests;

/// <summary>
/// Custom converter for parsing Layout files in json format to <see cref="LayoutModel" />
/// </summary>
/// <remarks>
/// The layout files in json format contains lots of polymorphism witch is hard for the
/// standard json parser to convert to an object graph. Using <see cref="Utf8JsonReader"/>
/// directly I can convert to a more suitable C# representation directly
/// </remarks>
public class LayoutModelConverterFromObject : JsonConverter<IReadOnlyDictionary<string, PageComponent>>
{
    /// <inheritdoc />
    public override IReadOnlyDictionary<string, PageComponent>? Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException(
                $"Unexpected JSON token type '{reader.TokenType}', expected '{nameof(JsonTokenType.StartObject)}'"
            );
        }

        var pages = new Dictionary<string, PageComponent>();

        // Read dictionary of pages
        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                // Think this is impossible. After a JsonTokenType.StartObject, everything should be JsonTokenType.PropertyName
                throw new JsonException(
                    $"Unexpected JSON token type after StartObject: '{reader.TokenType}', expected '{nameof(JsonTokenType.PropertyName)}'"
                );
            }

            var pageName =
                reader.GetString()
                ?? throw new JsonException(
                    $"Could not read property name from JSON token with type '{nameof(JsonTokenType.PropertyName)}'"
                );
            reader.Read();

            pages[pageName] = PageComponentConverter.ReadNotNull(ref reader, pageName, "test-layout", options);
        }

        return pages;
    }

    /// <inheritdoc />
    public override void Write(
        Utf8JsonWriter writer,
        IReadOnlyDictionary<string, PageComponent> value,
        JsonSerializerOptions options
    )
    {
        throw new NotImplementedException();
    }
}
