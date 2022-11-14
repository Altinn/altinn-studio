using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace Designer.Tests.Factories.ModelFactory.DataClasses;

[ExcludeFromCodeCoverage]
public class CSharpEnd2EndTestData: IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Model/Xsd/Gitea/nsm-klareringsportalen.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/stami-mu-bestilling-2021.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/dat-aarligmelding-bemanning.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/dihe-redusert-foreldrebetaling-bhg.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/hi-algeskjema.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/Kursdomene_APINøkkel_M_2020-05-26_5702_34556_SERES.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/nbib-melding.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/udir-invitasjon-vfkl.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/udir-vfkl.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/bokskjema.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/dat-bilpleie-soknad.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/dat-skjema.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/srf-fufinn-behovskartleggin.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/srf-melding-til-statsforvalteren.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/udi-unntak-karantenehotell-velferd.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/skjema.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/srf-fufinn-behovsendring.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/stami-atid-databehandler-2022.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/stami-mu-databehandler-2021.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/skd-formueinntekt-skattemelding-v2.xsd" };
        yield return new object[] { "Model/Xsd/Gitea/aal-vedlegg.xsd" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
