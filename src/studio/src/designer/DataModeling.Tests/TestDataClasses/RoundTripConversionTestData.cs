using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace DataModeling.Tests.TestDataClasses;

[ExcludeFromCodeCoverage]
public class RoundTripConversionTestData: IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Seres/HvemErHvem.xsd", "Seres/HvemErHvem.xml" };
        yield return new object[] { "Model/XmlSchema/Seres/SeresNillable.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3473_201512_forms_3123_37927.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4008_180226_forms_4186_37199.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3919_2_forms_4623_39043.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4741_4280_forms_5273_41269.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4830_4000_forms_5524_41951.xsd", string.Empty };
        yield return new object[] { "Seres/schema_5222_2_forms_5909_43507.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4532_1_forms_5274_41065.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4527_11500_forms_5273_41269.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4582_2000_forms_5244_42360.xsd", string.Empty };
        yield return new object[] { "Seres/schema_5064_1_forms_5793_42882.xsd", string.Empty };
        yield return new object[] { "Seres/schema_5259_1_forms_9999_50000.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4956_1_forms_5692_42617.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4660_1_forms_2500_2500.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4388-39288.xsd", string.Empty };
        yield return new object[] { "Seres/schema_RR-0200 Mellombalanse_M_2020-05-18_6301_45717_SERES.xsd", string.Empty };
        yield return new object[] { "Seres/schema_1266-42897.xsd", string.Empty };
        yield return new object[] { "Seres/schema_1266-43710.xsd", string.Empty };
        yield return new object[] { "Seres/schema_1266-44775.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3106-39629.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3124-39627.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3228-39613.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3238-39623.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3373-36491.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3428-39614.xsd", string.Empty };
        yield return new object[] { "Seres/schema_3430-39615.xsd", string.Empty };
        yield return new object[] { "Seres/schema_4213-39628.xsd", string.Empty };
        yield return new object[] { "Seres/schema_6199-44481.xsd", string.Empty };
        yield return new object[] { "Seres/schema_6301-45717.xsd", string.Empty };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
