using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Xml.Serialization;

using Microsoft.AspNetCore.Mvc.ModelBinding;

using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Apps.Ttd.Issue5740
{
#pragma warning disable SA1649 // File name should match first type name
    public class Skjema
#pragma warning restore SA1649 // File name should match first type name
    {
        [Range(int.MinValue, int.MaxValue)]
        [XmlAttribute("skjemanummer")]
        [BindNever]
        public decimal Skjemanummer { get; set; } = 1472;
    }
}
