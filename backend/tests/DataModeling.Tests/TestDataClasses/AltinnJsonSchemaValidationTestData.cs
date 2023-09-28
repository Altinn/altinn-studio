using System;
using System.Collections.Generic;
using Altinn.Studio.DataModeling.Validator.Json;

namespace DataModeling.Tests.TestDataClasses
{
    public static class AltinnJsonSchemaValidationTestData
    {
        public static IEnumerable<object[]> ValidSchemas() => new List<object[]>
        {
            new object[] { "Model/JsonSchema/General/Any.json" },
            new object[] { "Model/JsonSchema/General/Attributes.json" },
            new object[] { "Model/JsonSchema/General/BuiltinTypes.json" },
            new object[] { "Model/JsonSchema/General/ComplexContentExtension.json" },
            new object[] { "Model/JsonSchema/General/ComplexContentExtension_negative.json" },
            new object[] { "Model/JsonSchema/General/ComplexContentRestriction.json" },
            new object[] { "Model/JsonSchema/General/ComplexSchema.json" },
            new object[] { "Model/JsonSchema/General/Definitions.json" },
            new object[] { "Model/JsonSchema/General/ElementAnnotation.json" },
            new object[] { "Model/JsonSchema/General/InterleavedNestedSequences.json" },
            new object[] { "Model/JsonSchema/General/NestedArrays.json" },
            new object[] { "Model/JsonSchema/General/NestedChoice.json" },
            new object[] { "Model/JsonSchema/General/NestedSequence.json" },
            new object[] { "Model/JsonSchema/General/NestedSequences.json" },
            new object[] { "Model/JsonSchema/General/NestedWithArrayChoice.json" },
            new object[] { "Model/JsonSchema/General/NestedWithArraySequence.json" },
            new object[] { "Model/JsonSchema/General/NestedWithOptionalChoice.json" },
            new object[] { "Model/JsonSchema/General/NestedWithOptionalSequence.json" },
            new object[] { "Model/JsonSchema/General/NillableAttribute.json" },
            new object[] { "Model/JsonSchema/General/NonXsdContextSchema.json" },
            new object[] { "Model/JsonSchema/General/SchemaExampleWithTargetNamespace.json" },
            new object[] { "Model/JsonSchema/General/SimpleAll.json" },
            new object[] { "Model/JsonSchema/General/SimpleChoice.json" },
            new object[] { "Model/JsonSchema/General/SimpleContentExtension.json" },
            new object[] { "Model/JsonSchema/General/SimpleContentExtensionPlain.json" },
            new object[] { "Model/JsonSchema/General/SimpleContentRestriction.json" },
            new object[] { "Model/JsonSchema/General/SimpleSequence.json" },
            new object[] { "Model/JsonSchema/General/SimpleSequence_with_nonCompatible_XsdTypeAndType.json" },
            new object[] { "Model/JsonSchema/General/SimpleTypeList.json" },
            new object[] { "Model/JsonSchema/General/SimpleTypeRestrictions.json" }
        };

        public static IEnumerable<object[]> InvalidSchemas() => new List<object[]>
        {
            new object[]
            {
                "Model/JsonSchema/Incompatible/SchemaWithEmptyObjects.json",
                new Tuple<string, string>("#/properties/emptyObjectField", JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties),
                new Tuple<string, string>("#/properties/emptyObjectArray/items", JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties),
                new Tuple<string, string>("#/properties/objectField/properties/emptySubobject", JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties),
                new Tuple<string, string>("#/$defs/emptyObjectType", JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties),
            }
        };
    }
}
