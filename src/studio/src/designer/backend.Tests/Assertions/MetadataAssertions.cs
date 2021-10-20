using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Xunit;

namespace Designer.Tests.Assertions
{
    [ExcludeFromCodeCoverage]
    public static class MetadataAssertions
    {
        public static void IsEquivalentTo(ModelMetadata expected, ModelMetadata actual)
        {
            IsEquivalentTo(expected.Elements, actual.Elements);
        }

        private static void IsEquivalentTo(Dictionary<string, ElementMetadata> expected, Dictionary<string, ElementMetadata> actual)
        {
            Assert.Equal(expected.Count, actual.Count);

            foreach (var (expectedKey, expectedElement) in expected)
            {
                var actualElement = actual.FirstOrDefault(e => e.Key == expectedKey).Value;
                Assert.NotNull(actualElement);

                IsEquivalentTo(expectedElement, actualElement);
            }
        }

        private static void IsEquivalentTo(ElementMetadata expectedElement, ElementMetadata actualElement)
        {
            Assert.Equal(expectedElement.ID, actualElement.ID);
            Assert.Equal(expectedElement.ParentElement, expectedElement.ParentElement);
            Assert.Equal(expectedElement.Name, actualElement.Name);

            //Assert.Equal(expectedElement.TypeName, actualElement.TypeName);
            Assert.Equal(expectedElement.Type, actualElement.Type);
            Assert.Equal(expectedElement.XName, actualElement.XName);
            Assert.Equal(expectedElement.XPath, actualElement.XPath);
            Assert.Equal(expectedElement.XsdValueType, actualElement.XsdValueType);
            Assert.Equal(expectedElement.MinOccurs, actualElement.MinOccurs);
            Assert.Equal(expectedElement.MaxOccurs, actualElement.MaxOccurs);
            Assert.Equal(expectedElement.DataBindingName, actualElement.DataBindingName);
            Assert.Equal(expectedElement.FixedValue, actualElement.FixedValue);
        }
    }
}
