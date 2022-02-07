using System;
using System.ComponentModel.DataAnnotations;

using System.Xml.Serialization;

using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.App.IntegrationTests.Mocks.Ttd.EFormidling
{
    /// <summary>
    /// The skjema
    /// </summary>
    public class Skjema
    {
        [Range(int.MinValue, int.MaxValue)]
        [XmlAttribute("skjemanummer")]
        [BindNever]
        public decimal Skjemanummer { get; set; } = 1472;
    }
}
