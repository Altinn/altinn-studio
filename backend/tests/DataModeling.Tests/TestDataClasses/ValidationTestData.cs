using System.Collections;
using System.Collections.Generic;

namespace DataModeling.Tests.BaseClasses;

public class ValidationTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Model/XmlSchema/Gitea/nsm-klareringsportalen.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/stami-mu-bestilling-2021.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/dat-aarligmelding-bemanning.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/dihe-redusert-foreldrebetaling-bhg.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/nbib-melding.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/udir-vfkl.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/dat-bilpleie-soknad.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/stami-atid-databehandler-2022.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/stami-mu-databehandler-2021.xsd" };
        yield return new object[] { "Model/XmlSchema/Gitea/skd-formueinntekt-skattemelding-v2.xsd" };

        // Can generate non valid date string from regex
        // yield return new object[] { "Model/XmlSchema/Gitea/hi-algeskjema.xsd" };
        // yield return new object[] { "Model/XmlSchema/Gitea/udir-invitasjon-vfkl.xsd" };
        // yield return new object[] { "Model/XmlSchema/Gitea/dat-skjema.xsd" };
        // yield return new object[] { "Model/XmlSchema/Gitea/udi-unntak-karantenehotell-velferd.xsd" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
