using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Metamodel;
using DataModeling.Tests.BaseClasses;
using Xunit;

namespace DataModeling.Tests;

public class IntegerValidationGenerationTests : CsharpModelConversionTestsBase<IntegerValidationGenerationTests>
{
    [Theory]
    [InlineData("integer", "323.00")]
    [InlineData("positiveInteger", "+323.00")]
    [InlineData("negativeInteger", "-323.00")]
    [InlineData("nonNegativeInteger", "0.00")]
    [InlineData("nonPositiveInteger", "0.00")]
    public void DecimalBackedInteger_RejectsFractionsAndAcceptsWholeNumbers(string xsdType, string wholeNumber)
    {
        var property = GenerateProperty(xsdType);
        Assert.Equal(typeof(decimal?), property.PropertyType);
        var regex = Assert.Single(property.GetCustomAttributes<RegularExpressionAttribute>());
        Assert.True(Validate(property, decimal.Parse(wholeNumber, CultureInfo.InvariantCulture)));
        var fraction = xsdType is "negativeInteger" or "nonPositiveInteger" ? -323.22m : 323.22m;
        Assert.False(regex.IsValid(fraction));
        Assert.False(Validate(property, fraction));
        Assert.True(Validate(property, null));
    }

    [Theory]
    [InlineData("en-US", false)]
    [InlineData("nb-NO", false)]
    [InlineData("nn-NO", false)]
    [InlineData("en-US", true)]
    [InlineData("nb-NO", true)]
    [InlineData("nn-NO", true)]
    public void RestrictedXmlTextInteger_DeserializesDecimalButRejectsFractionDuringValidation(
        string culture,
        bool totalDigits
    )
    {
        var originalCulture = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo(culture);
            var property = GenerateProperty(
                "integer",
                """
                <xs:maxInclusive value="999999999999999" />
                <xs:minInclusive value="-999999999999999" />
                """ + (totalDigits ? "<xs:totalDigits value=\"15\" />" : ""),
                xmlText: true
            );
            Assert.Equal(typeof(decimal?), property.PropertyType);
            var range = Assert.Single(property.GetCustomAttributes<RangeAttribute>());
            var regex = Assert.Single(property.GetCustomAttributes<RegularExpressionAttribute>());

            var model = JsonSerializer.Deserialize("""{"value":323.22}""", property.DeclaringType);
            Assert.Equal(323.22m, property.GetValue(model));
            Assert.True(range.IsValid(323.22m));
            Assert.False(regex.IsValid(323.22m));
            Assert.False(Validate(property, property.GetValue(model)));
            Assert.True(Validate(property, 323.00m));
            Assert.True(Validate(property, -323.00m));
            Assert.True(Validate(property, 999999999999999m));
            Assert.True(Validate(property, -999999999999999m));
            Assert.False(Validate(property, 1000000000000000m));
            Assert.False(Validate(property, null));
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }
    }

    [Theory]
    [InlineData(@"^[0-9]{2,3}(?:[.,][0-9]+)?$", false)]
    [InlineData(null, true)]
    [InlineData(@"^[0-9]{2,3}(?:[.,][0-9]+)?$", true)]
    public void ExistingPatternRestrictions_CompileAndRemainEffective(string pattern, bool totalDigits)
    {
        var property = GenerateProperty(
            "integer",
            totalDigits ? "<xs:totalDigits value=\"3\" />" : "",
            pattern: pattern
        );
        Assert.Single(property.GetCustomAttributes<RegularExpressionAttribute>());
        Assert.True(Validate(property, 123.00m));
        Assert.False(Validate(property, 123.22m));
        Assert.False(Validate(property, 1234.00m));
        if (pattern is not null)
            Assert.False(Validate(property, 1m));
    }

    [Theory]
    [InlineData("decimal", typeof(decimal?))]
    [InlineData("double", typeof(decimal?))]
    [InlineData("int", typeof(int?))]
    [InlineData("long", typeof(long?))]
    [InlineData("short", typeof(short?))]
    public void OtherNumberTypes_KeepTheirMappingWithoutIntegerRegex(string xsdType, Type expectedType)
    {
        var property = GenerateProperty(xsdType);
        Assert.Equal(expectedType, property.PropertyType);
        Assert.Empty(property.GetCustomAttributes<RegularExpressionAttribute>());
        if (xsdType == "decimal")
            Assert.True(Validate(property, 323.22m));
    }

    [Fact]
    public void IntegerRegex_PreservesConfiguredValidationMessage()
    {
        const string message = "Only whole numbers are allowed.";
        var property = GenerateProperty("integer", "<xs:maxInclusive value=\"999\" />", errorMessage: message);
        Assert.Equal(message, property.GetCustomAttribute<RegularExpressionAttribute>().ErrorMessage);
        Assert.Equal(message, property.GetCustomAttribute<RangeAttribute>().ErrorMessage);
    }

    private PropertyInfo GenerateProperty(
        string xsdType,
        string restrictions = "",
        bool xmlText = false,
        string pattern = null,
        string errorMessage = null
    )
    {
        var contentType = xmlText
            ? """
                <xs:complexType name="AmountType">
                  <xs:simpleContent>
                    <xs:extension base="NumberType">
                      <xs:attribute fixed="39889" name="orid" type="xs:string" use="required" />
                    </xs:extension>
                  </xs:simpleContent>
                </xs:complexType>
                """
            : string.Empty;
        var schema = $$"""
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:simpleType name="NumberType">
                <xs:restriction base="xs:{{xsdType}}">{{restrictions}}</xs:restriction>
              </xs:simpleType>
              {{contentType}}
              <xs:element name="Root">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="Amount" type="{{(xmlText ? "AmountType" : "NumberType")}}" minOccurs="0" />
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
            </xs:schema>
            """;
        using var reader = XmlReader.Create(new StringReader(schema));
        LoadedXsdSchema = XmlSchema.Read(reader, null);
        var schemas = new XmlSchemaSet();
        schemas.Add(LoadedXsdSchema);
        schemas.Compile();

        LoadedXsdSchemaConvertedToJsonSchema();
        ConvertedJsonSchemaConvertedToModelMetadata();
        if (pattern is not null || errorMessage is not null)
        {
            var field = ModelMetadata.Elements.Values.Single(element => element.XsdValueType == BaseValueType.Integer);
            if (pattern is not null)
                field.Restrictions["pattern"] = new Restriction { Value = pattern };
            if (errorMessage is not null)
                field.Texts[TextCategoryType.Error.ToString()] = errorMessage;
        }
        ModelMetadataConvertedToCsharpClass();
        CSharpClassesCompiledToAssembly();

        var type = CompiledAssembly.GetTypes().Single(type => type.Name == (xmlText ? "AmountType" : "Root"));
        return type.GetProperty(xmlText ? "valueNullable" : "Amount");
    }

    private static bool Validate(PropertyInfo property, object value)
    {
        var model = Activator.CreateInstance(property.DeclaringType);
        property.SetValue(model, value);
        var context = new ValidationContext(model) { MemberName = property.Name };
        return Validator.TryValidateProperty(value, context, new List<ValidationResult>());
    }
}
