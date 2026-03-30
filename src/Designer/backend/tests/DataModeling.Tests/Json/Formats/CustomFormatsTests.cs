using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Formats;
using Xunit;

namespace DataModeling.Tests.Json.Formats;

public class CustomFormatsTests
{
    private static readonly Type s_type = typeof(CustomFormats);
    private const string JsonStructure =
        @"{
                                              ""DateField"": ""1994-01"",
                                              ""Number"": 100,
                                              ""Object"": {""Area"":""Økern"",""Description"":""Portal""}
                                            }";

    [Theory]
    [InlineData("DateField", true)]
    [InlineData("Number", true)]
    [InlineData("Object", true)]
    public void TestDateFormat(string property, bool expected)
    {
        var checkDateMethod = s_type
            .GetMethods(BindingFlags.Static | BindingFlags.NonPublic)
            .First(x => x.Name == "CheckDate" && x.IsPrivate && x.IsStatic);

        using var doc = JsonDocument.Parse(JsonStructure);
        var element = doc.RootElement.GetProperty(property);

        var result = checkDateMethod.Invoke(null, new object[] { element });

        Assert.Equal(expected, (bool)result);
    }
}
