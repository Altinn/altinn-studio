using System;
using System.ComponentModel.DataAnnotations;

using System.Xml.Serialization;

using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace App.IntegrationTests.Mocks.Apps.Ttd.AutoDeleteData
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
