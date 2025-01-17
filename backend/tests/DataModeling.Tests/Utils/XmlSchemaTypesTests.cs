using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.DataModeling.Utils;
using Xunit;

namespace DataModeling.Tests.Utils;

public class XmlSchemaTypesTests
{
    [Theory]
    [MemberData(nameof(TestData))]
    public void AllTypesShouldContainType(string type)
    {
        Assert.Contains(type, XmlSchemaTypes.AllKnownTypes);
    }

    [Fact]
    public void AllTypesShouldHave50Types()
    {
        Assert.Equal(49, XmlSchemaTypes.AllKnownTypes.Count());
    }

    public static IEnumerable<object[]> TestData => new List<object[]>
    {
        new object[] { "string" },
        new object[] { "boolean" },
        new object[] { "float" },
        new object[] { "double" },
        new object[] { "decimal" },
        new object[] { "dateTime" },
        new object[] { "duration" },
        new object[] { "hexBinary" },
        new object[] { "base64Binary" },
        new object[] { "anyURI" },
        new object[] { "ID" },
        new object[] { "IDREF" },
        new object[] { "ENTITY" },
        new object[] { "NOTATION" },
        new object[] { "normalizedString" },
        new object[] { "token" },
        new object[] { "language" },
        new object[] { "IDREFS" },
        new object[] { "ENTITIES" },
        new object[] { "NMTOKEN" },
        new object[] { "NMTOKENS" },
        new object[] { "Name" },
        new object[] { "QName" },
        new object[] { "NCName" },
        new object[] { "integer" },
        new object[] { "nonNegativeInteger" },
        new object[] { "positiveInteger" },
        new object[] { "nonPositiveInteger" },
        new object[] { "negativeInteger" },
        new object[] { "byte" },
        new object[] { "int" },
        new object[] { "long" },
        new object[] { "short" },
        new object[] { "unsignedByte" },
        new object[] { "unsignedInt" },
        new object[] { "unsignedLong" },
        new object[] { "unsignedShort" },
        new object[] { "date" },
        new object[] { "time" },
        new object[] { "gYearMonth" },
        new object[] { "gYear" },
        new object[] { "gMonthDay" },
        new object[] { "gDay" },
        new object[] { "gMonth" },
        new object[] { "anyAtomicType" },
        new object[] { "anySimpleType" },
        new object[] { "yearMonthDuration" },
        new object[] { "dayTimeDuration" },
        new object[] { "dateTimeStamp" }
    };
}
