using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Converters;
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Altinn.Studio.Designer.Tests.Converters
{
    public class NextStepTypeJsonConverterTests
    {
        private readonly JsonSerializerOptions _options;

        public NextStepTypeJsonConverterTests()
        {
            _options = new JsonSerializerOptions();
            _options.Converters.Add(new NextStepTypeJsonConverter());
        }

        [Theory]
        [InlineData("\"configuration\"", NextStepType.Configuration)]
        [InlineData("\"konfigurasjon\"", NextStepType.Configuration)]
        [InlineData("\"code-change\"", NextStepType.CodeChange)]
        [InlineData("\"kodeendring\"", NextStepType.CodeChange)]
        [InlineData("\"documentation\"", NextStepType.Documentation)]
        [InlineData("\"dokumentasjon\"", NextStepType.Documentation)]
        public void Read_ValidStrings_ReturnsExpectedEnum(string json, NextStepType expected)
        {
            var result = JsonSerializer.Deserialize<NextStepType>(json, _options);
            Assert.Equal(expected, result);
        }

        [Theory]
        [InlineData("\"unknown\"")]
        [InlineData("\"\"")]
        [InlineData("null")]
        public void Read_InvalidStrings_ThrowsJsonException(string json)
        {
            Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<NextStepType>(json, _options));
        }

        [Theory]
        [InlineData(NextStepType.Configuration, "\"configuration\"")]
        [InlineData(NextStepType.CodeChange, "\"code-change\"")]
        [InlineData(NextStepType.Documentation, "\"documentation\"")]
        public void Write_EnumValue_WritesPreferredString(NextStepType value, string expectedJson)
        {
            var json = JsonSerializer.Serialize(value, _options);
            Assert.Equal(expectedJson, json);
        }
    }
}
