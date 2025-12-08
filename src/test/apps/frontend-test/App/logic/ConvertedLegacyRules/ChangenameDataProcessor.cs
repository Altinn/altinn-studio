using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Models;

#nullable enable

namespace Altinn.App.Logic.ConvertedLegacyRules;

public class ChangenameDataProcessor : IDataWriteProcessor
{
    public async Task ProcessDataWrite(
        IInstanceDataMutator instanceDataMutator,
        string taskId,
        DataElementChanges changes,
        string? language)
    {
        var change = changes.FormDataChanges.FirstOrDefault(c => c.CurrentFormData is Skjema);
        if (change == null)
        {
            return;
        }

        var wrapper = change.CurrentFormDataWrapper;
        var data = change.CurrentFormData as Skjema;

        await Rule_b9dcddd0deb411e99cfd6f791e4f04e5(wrapper, data);
    }

    private async Task Rule_b9dcddd0deb411e99cfd6f791e4f04e5(IFormDataWrapper wrapper, Skjema? data)
    {
        // Rule configuration:
        //   SelectedFunction: nyttNavn
        //   InputParams:
        //     fornavn = NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value
        //     mellomnavn = NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value
        //     etternavn = NyttNavn-grp-9313.NyttNavn-grp-9314.PersonEtternavnNytt-datadef-34757.value
        //   OutParams:
        //     outParam0 = Innledning-grp-9309.NavneendringenGjelderFor-grp-9310.SubjektFornavnFolkeregistrert-datadef-34730.value

        // Original JavaScript function: nyttNavn
        // (function(obj) {
        //         obj.fornavn = obj.fornavn ? obj.fornavn + ' ' : '';
        //         obj.mellomnavn = obj.mellomnavn ? obj.mellomnavn + ' ' : '';
        //         obj.etternavn = obj.etternavn ? obj.etternavn : '';
        //         return obj.fornavn + obj.mellomnavn + obj.etternavn;
        //     })

        var fornavn = (string?)wrapper.Get("NyttNavn-grp-9313.NyttNavn-grp-9314.PersonFornavnNytt-datadef-34758.value");
        var mellomnavn = (string?)wrapper.Get("NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value");
        var etternavn = (string?)wrapper.Get("NyttNavn-grp-9313.NyttNavn-grp-9314.PersonEtternavnNytt-datadef-34757.value");

        fornavn = !string.IsNullOrEmpty(fornavn) ? fornavn + " " : "";
        mellomnavn = !string.IsNullOrEmpty(mellomnavn) ? mellomnavn + " " : "";
        etternavn = !string.IsNullOrEmpty(etternavn) ? etternavn : "";

        if (data is not null)
        {
            data.Innledninggrp9309 ??= new Innledninggrp9309();
            data.Innledninggrp9309.NavneendringenGjelderForgrp9310 ??= new NavneendringenGjelderForgrp9310();
            data.Innledninggrp9309.NavneendringenGjelderForgrp9310?.SubjektFornavnFolkeregistrertdatadef34730 = new SubjektFornavnFolkeregistrertdatadef34730
            {
                value = fornavn + mellomnavn + etternavn
            };
        }

        await Task.CompletedTask;
    }

}
