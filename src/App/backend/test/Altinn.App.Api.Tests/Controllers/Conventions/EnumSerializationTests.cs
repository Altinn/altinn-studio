using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers.Conventions;

public class EnumSerializationTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int PartyId = 500600;

    private readonly Mock<IAuthorizationClient> _authorizationClientMock;
    private readonly Mock<IAppMetadata> _appMetadataMock;

    public EnumSerializationTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        // Mock auth client to return the enum we want to test
        _authorizationClientMock = new Mock<IAuthorizationClient>();
        _authorizationClientMock
            .Setup(a => a.GetPartyList(It.IsAny<int>()))
            .ReturnsAsync([new() { PartyTypeName = PartyType.Person }]);

        _appMetadataMock = new Mock<IAppMetadata>();
        _appMetadataMock
            .Setup(s => s.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata(id: "ttd/test") { PartyTypesAllowed = new PartyTypesAllowed { Person = true } }
            );

        OverrideServicesForAllTests = (services) =>
        {
            services
                .AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.Converters.Add(new CustomConverterFactory());
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });

            services.AddSingleton(_authorizationClientMock.Object);
            services.AddSingleton(_appMetadataMock.Object);
        };
    }

    [Fact]
    public async Task ValidateInstantiation_SerializesPartyTypesAllowedAsNumber()
    {
        // Arrange
        using var client = GetRootedUserClient(Org, App, 1337, PartyId);

        // Act
        var response = await client.PostAsync(
            $"{Org}/{App}/api/v1/parties/validateInstantiation?partyId={PartyId}",
            null
        );
        response.Should().HaveStatusCode(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();

        var partyTypeEnumJson = JsonDocument
            .Parse(content)
            .RootElement.GetProperty("validParties")
            .EnumerateArray()
            .First()
            .GetProperty("partyTypeName");

        // Assert
        partyTypeEnumJson.Should().NotBeNull();
        partyTypeEnumJson.TryGetInt32(out var partyTypeJsonValue);
        partyTypeJsonValue.Should().Be(1, "PartyTypesAllowed should be serialized as its numeric value");
    }
}

public class CustomConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) => typeToConvert is not null;

    public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        var converterType = typeof(CustomConverter<>).MakeGenericType(typeToConvert);
        return (JsonConverter)Activator.CreateInstance(converterType)!;
    }
}

public class CustomConverter<T> : JsonConverter<T>
{
    public override T? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (typeof(T).IsEnum)
        {
            var enumString = reader.GetString();

            if (Enum.TryParse(typeof(T), enumString, out var enumValue))
            {
                return (T)enumValue;
            }
            else
            {
                throw new JsonException($"Unable to convert \"{enumString}\" to enum \"{typeof(T)}\".");
            }
        }
        else
        {
            return JsonSerializer.Deserialize<T>(ref reader, options);
        }
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        if (value is Enum)
        {
            writer.WriteStringValue(value.ToString());
        }
        else
        {
            JsonSerializer.Serialize(writer, value, value!.GetType(), options);
        }
    }
}
