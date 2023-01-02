using System.Collections.Generic;
using System.Linq;
using System.Xml;

namespace Altinn.Studio.DataModeling.Utils;

/// <summary>
/// Contains known types from http://www.w3.org/2001/XMLSchema namespace.
/// </summary>
public static class XmlSchemaTypes
{
    /// <summary>
    /// string data type.
    /// </summary>
    public const string String = "string";

    /// <summary>
    /// boolean data type.
    /// </summary>
    public const string Boolean = "boolean";

    /// <summary>
    /// float data type.
    /// </summary>
    public const string Float = "float";

    /// <summary>
    /// double data type.
    /// </summary>
    public const string Double = "double";

    /// <summary>
    /// decimal data type.
    /// </summary>
    public const string Decimal = "decimal";

    /// <summary>
    /// dateTime data type.
    /// </summary>
    public const string DateTime = "dateTime";

    /// <summary>
    /// duration data type.
    /// </summary>
    public const string Duration = "duration";

    /// <summary>
    /// hexBinary data type.
    /// </summary>
    public const string HexBinary = "hexBinary";

    /// <summary>
    /// base64Binary data type.
    /// </summary>
    public const string Base64Binary = "base64Binary";

    /// <summary>
    /// anyURI data type.
    /// </summary>
    public const string AnyUri = "anyURI";

    /// <summary>
    /// ID data type.
    /// </summary>
    public const string Id = "ID";

    /// <summary>
    /// IDREF data type.
    /// </summary>
    public const string Idref = "IDREF";

    /// <summary>
    /// ENTITY data type.
    /// </summary>
    public const string Entity = "ENTITY";

    /// <summary>
    /// NOTATION data type.
    /// </summary>
    public const string Notation = "NOTATION";

    /// <summary>
    /// normalizedString data type.
    /// </summary>
    public const string NormalizedString = "normalizedString";

    /// <summary>
    /// token data type.
    /// </summary>
    public const string Token = "token";

    /// <summary>
    /// language data type.
    /// </summary>
    public const string Language = "language";

    /// <summary>
    /// IDREFS data type.
    /// </summary>
    public const string Idrefs = "IDREFS";

    /// <summary>
    /// ENTITIES data type.
    /// </summary>
    public const string Entities = "ENTITIES";

    /// <summary>
    /// NMTOKEN data type.
    /// </summary>
    public const string NmToken = "NMTOKEN";

    /// <summary>
    /// NMTOKENS data type.
    /// </summary>
    public const string NmTokens = "NMTOKENS";

    /// <summary>
    /// Name data type.
    /// </summary>
    public const string Name = "Name";

    /// <summary>
    /// QName data type.
    /// </summary>
    public const string QName = "QName";

    /// <summary>
    /// NCName data type.
    /// </summary>
    public const string NcName = "NCName";

    /// <summary>
    /// integer data type.
    /// </summary>
    public const string Integer = "integer";

    /// <summary>
    /// nonNegativeInteger data type.
    /// </summary>
    public const string NonNegativeInteger = "nonNegativeInteger";

    /// <summary>
    /// positiveInteger data type.
    /// </summary>
    public const string PositiveInteger = "positiveInteger";

    /// <summary>
    /// nonPositiveInteger data type.
    /// </summary>
    public const string NonPositiveInteger = "nonPositiveInteger";

    /// <summary>
    /// negativeInteger data type.
    /// </summary>
    public const string NegativeInteger = "negativeInteger";

    /// <summary>
    /// byte data type.
    /// </summary>
    public const string Byte = "byte";

    /// <summary>
    /// int data type.
    /// </summary>
    public const string Int = "int";

    /// <summary>
    /// long data type.
    /// </summary>
    public const string Long = "long";

    /// <summary>
    /// short data type.
    /// </summary>
    public const string Short = "short";

    /// <summary>
    /// unsignedByte data type.
    /// </summary>
    public const string UnsignedByte = "unsignedByte";

    /// <summary>
    /// unsignedInt data type.
    /// </summary>
    public const string UnsignedInt = "unsignedInt";

    /// <summary>
    /// unsignedLong data type.
    /// </summary>
    public const string UnsignedLong = "unsignedLong";

    /// <summary>
    /// unsignedShort data type.
    /// </summary>
    public const string UnsignedShort = "unsignedShort";

    /// <summary>
    /// date data type.
    /// </summary>
    public const string Date = "date";

    /// <summary>
    /// time data type.
    /// </summary>
    public const string Time = "time";

    /// <summary>
    /// gYearMonth data type.
    /// </summary>
    public const string GYearMonth = "gYearMonth";

    /// <summary>
    /// gYear data type.
    /// </summary>
    public const string GYear = "gYear";

    /// <summary>
    /// gMonthDay data type.
    /// </summary>
    public const string GMonthDay = "gMonthDay";

    /// <summary>
    /// gDay data type.
    /// </summary>
    public const string GDay = "gDay";

    /// <summary>
    /// gMonth data type.
    /// </summary>
    public const string GMonth = "gMonth";

    /// <summary>
    /// anyAtomicType data type.
    /// </summary>
    public const string AnyAtomicType = "anyAtomicType";

    /// <summary>
    /// anySimpleType data type.
    /// </summary>
    public const string AnySimpleType = "anySimpleType";

    /// <summary>
    /// yearMonthDuration data type.
    /// </summary>
    public const string YearMonthDuration = "yearMonthDuration";

    /// <summary>
    /// dayTimeDuration data type.
    /// </summary>
    public const string DayTimeDuration = "dayTimeDuration";

    /// <summary>
    /// dateTimeStamp data type
    /// </summary>
    public const string DateTimeStamp = "dateTimeStamp";

    /// <summary>
    /// Gets all types from http://www.w3.org/2001/XMLSchema namespace.
    /// </summary>
    public static IEnumerable<string> AllKnownTypes => typeof(XmlSchemaTypes).GetFields()
        .Select(fieldInfo => typeof(XmlSchemaTypes).GetField(fieldInfo.Name)!.GetValue(null) as string).ToList();

    /// <summary>
    /// Checks if <see cref="XmlQualifiedName"/> is type from http://www.w3.org/2001/XMLSchema namespace
    /// </summary>
    public static bool IsKnownXmlSchemaType(XmlQualifiedName name) =>
        KnownXmlNamespaces.XmlSchemaNamespace.Equals(name.Namespace) && AllKnownTypes.Contains(name.Name);

    /// <summary>
    /// Returns date data types.
    /// </summary>
    public static IEnumerable<string> DateTypes => new List<string>
    {
        Date,
        DateTime,
        Duration,
        GDay,
        GMonth,
        GMonthDay,
        GYear,
        GYearMonth,
        Time
    };
}
