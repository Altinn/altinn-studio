using System.Collections;
using System.Collections.Generic;

namespace Designer.Tests.Factories.ModelFactory.DataClasses;

public class ValidationTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Model/Xsd/Gitea/nsm-klareringsportalen.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/stami-mu-bestilling-2021.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/dat-aarligmelding-bemanning.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/dihe-redusert-foreldrebetaling-bhg.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/nbib-melding.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/udir-vfkl.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/stami-atid-databehandler-2022.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/stami-mu-databehandler-2021.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/skd-formueinntekt-skattemelding-v2.xsd" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
