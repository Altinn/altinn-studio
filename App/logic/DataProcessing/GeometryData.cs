#nullable enable

using System.Collections.Generic;
using Altinn.App.Models;

namespace Altinn.App.logic.DataProcessing;

public class GeometryData
{
    public static List<Geometry> GetGeometryData(string? selected)
    {
        List<Geometry> Geometries = new List<Geometry>();

        if (selected?.Contains("1") == true) {
            Geometries.Add(new() { Label = "Hankabakken 1", Data = "POLYGON ((16.1096835728424 67.1452365035596,16.1190491078039 67.1451712353654,16.118841539588 67.1406869499763,16.109477740932 67.1407522039498,16.1096835728424 67.1452365035596))" });
        }
        if (selected?.Contains("2") == true) {
            Geometries.Add(new() { Label = "Hankabakken 2", Data = "POLYGON ((16.0844471059834 67.1454096440408,16.1096835728424 67.1452365035596,16.1096284017344 67.1440347115437,16.0843931889725 67.1442078419132,16.0844471059834 67.1454096440408))" });
        }
        if (selected?.Contains("3") == true) {
            Geometries.Add(new() { Label = "Hankabakken 3", Data = "POLYGON ((16.0843931889725 67.1442078419132,16.0914055727082 67.1441601320718,16.0912573849201 67.1408776044743,16.0842459528488 67.1409253067063,16.0843931889725 67.1442078419132))" });
        }
        if (selected?.Contains("4") == true) {
            Geometries.Add(new() { Label = "Hankabakken 4", Data = "POLYGON ((16.091294225332 67.1416937521884,16.1095151961509 67.1415683466908,16.109477740932 67.1407522039498,16.0912573849201 67.1408776044743,16.091294225332 67.1416937521884))" });
        }
        if (selected?.Contains("5") == true) {
            Geometries.Add(new() { Label = "Hankabakken 5", Data = "POLYGON ((16.0957778974798 67.1408466860878,16.118841539588 67.1406869499763,16.1186340551949 67.1362026617326,16.0955746880334 67.1363623630455,16.0957778974798 67.1408466860878))" });
        }
        if (selected?.Contains("6") == true) {
            Geometries.Add(new() { Label = "Hankabakken 6", Data = "POINT (16.098 67.140)" });
        }
        if (selected?.Contains("7") == true) {
            Geometries.Add(new() { Label = "Hankabakken 7", Data = "POINT (16.092 67.138)" });
        }
        if (selected?.Contains("8") == true) {
            Geometries.Add(new() { Label = "Hankabakken 8", Data = "POINT (16.100 67.1365)" });
        }

        return Geometries;
    }
}
