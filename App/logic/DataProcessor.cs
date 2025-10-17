#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Models;
using Altinn.App.Models.modell2;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Components.Forms;

namespace Altinn.App.logic.DataProcessing
{
    public class DataProcessor : IDataProcessor
    {
        public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language)
        {
            return Task.CompletedTask;
        }

        public Task ProcessDataWrite(
            Instance instance,
            Guid? dataId,
            object data,
            object? previous,
            string? language
        )
        {
            if (data.GetType() == typeof(modell2))
            {
                ProcessModel2((modell2)data);
            }

            return Task.CompletedTask;
        }

        private void ProcessModel2(modell2 data)
        {
            foreach (var person in data.personer)
            {
                if (
                    !string.IsNullOrEmpty(person.fødselsdato)
                    && DateOnly.TryParse(person.fødselsdato, out var birthDate)
                )
                {
                    var today = DateTime.UtcNow;
                    int age = today.Year - birthDate.Year;
                    if (
                        today.Month < birthDate.Month
                        || (today.Month == birthDate.Month && today.Day < birthDate.Day)
                    )
                    {
                        age--;
                    }

                    person.alder = age;
                }
                else
                {
                    person.alder = null;
                }
            }
        }
    }
}
