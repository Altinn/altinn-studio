import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Stedfeste i kart', en: 'Map' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: true,
  },
})
  .addDataModelBinding(
    new CG.obj(
      new CG.prop('simpleBinding', new CG.dataModelBinding().optional()),
      new CG.prop(
        'geometries',
        new CG.dataModelBinding()
          .optional()
          .setDescription(
            'Should point to an array of objects like {data: string, label: string} (these can also be configured via separate bindings)',
            'Skal peke på en liste med objekter på formen {data: string, label: string}. Verdiene kan også konfigureres med separate bindinger.',
          ),
      ),
      new CG.prop(
        'geometryLabel',
        new CG.dataModelBinding()
          .optional()
          .setDescription(
            'Should point to a string (defaults to a "label" property on the geometries array objects)',
            'Skal peke på en streng. Standard er «label»-egenskapen i objektene i geometrilisten.',
          ),
      ),
      new CG.prop(
        'geometryData',
        new CG.dataModelBinding()
          .optional()
          .setDescription(
            'Should point to a string (defaults to a "data" property on the geometries array objects)',
            'Skal peke på en streng. Standard er «data»-egenskapen i objektene i geometrilisten.',
          ),
      ),
      new CG.prop(
        'geometryIsEditable',
        new CG.dataModelBinding()
          .optional()
          .setDescription(
            'Should point to a boolean indicating if this geometry is editable. This has no default value, geometries will not be editable if this is not specified.',
            'Skal peke på en boolsk verdi som angir om geometrien kan redigeres. Geometrien kan ikke redigeres hvis egenskapen ikke er satt.',
          ),
      ),
      new CG.prop(
        'geometryIsHidden',
        new CG.dataModelBinding()
          .optional()
          .setDescription(
            'Should point to a boolean indicating if this geometry is hidden. Geometries will be visible by default if this is not specified.',
            'Skal peke på en boolsk verdi som angir om geometrien er skjult. Geometrien er synlig hvis egenskapen ikke er satt.',
          ),
      ),
      new CG.prop(
        'geometryStyle',
        new CG.dataModelBinding()
          .optional()
          .setDescription(
            'Should point to a JSON-serialized Leaflet PathOptions object (e.g. \'{"color":"#ff0000","weight":2,"fillOpacity":0.3}\') used as the style for this geometry. Overrides the default style. Invalid JSON is ignored.',
            'Skal peke på et JSON-serialisert Leaflet PathOptions-objekt som brukes som stil for geometrien. Overstyrer standardstilen. Ugyldig JSON ignoreres.',
          ),
      ),
    ).exportAs('IDataModelBindingsForMap'),
  )
  .addProperty(
    new CG.prop(
      'layers',
      new CG.arr(
        new CG.union(
          new CG.obj(
            new CG.prop(
              'url',
              new CG.str()
                .setTitle('Map layer url', 'URL til kartlag')
                .setDescription(
                  'Url to a map tile. {z}/{x}/{y} will be replaced with tile coordinates, {s} will be ' +
                    'replaced with a random subdomain if subdomains are given',
                  'URL-en til en kartflis. Plassholderne erstattes med fliskoordinater og eventuelt et subdomene.',
                ),
            ),
            new CG.prop(
              'attribution',
              new CG.str()
                .optional()
                .setTitle('Attribution', 'Kreditering')
                .setDescription(
                  'Ascribing a work or remark to a particular unit for recognition',
                  'Kreditering av opphavsperson eller organisasjon.',
                ),
            ),
            new CG.prop(
              'subdomains',
              new CG.arr(new CG.str())
                .optional()
                .setTitle('Subdomains', 'Subdomener')
                .setDescription(
                  'List of subdomains. Used for balancing the load on different map tiling servers. ' +
                    'A random one will replace {s} in the defined url.',
                  'Liste over subdomener som fordeler lasten mellom kartservere.',
                ),
            ),
            new CG.prop(
              'type',
              new CG.const('TileLayer')
                .optional({ default: 'TileLayer' })
                .setTitle('Layer Type', 'Lagtype')
                .setDescription('Type of the map layer', 'Kartlagets type.'),
            ),
            new CG.prop(
              'minZoom',
              new CG.num()
                .optional({ default: 0 })
                .setTitle('Minimum Zoom Level', 'Minimalt zoomnivå')
                .setDescription('The minimum zoom level for the layer', 'Minimalt zoomnivå for laget.'),
            ),
            new CG.prop(
              'maxZoom',
              new CG.num()
                .optional({ default: 18 })
                .setTitle('Maximum Zoom Level', 'Maksimalt zoomnivå')
                .setDescription('The maximum zoom level for the layer', 'Maksimalt zoomnivå for laget.'),
            ),
          ).exportAs('MapTileLayer'),
          new CG.obj(
            new CG.prop(
              'url',
              new CG.str()
                .setTitle('Map layer url', 'URL til kartlag')
                .setDescription('Url to a wms-type map server', 'URL-en til en kartserver av typen WMS.'),
            ),
            new CG.prop('attribution', new CG.str().optional()),
            new CG.prop('subdomains', new CG.arr(new CG.str()).optional()),
            new CG.prop('type', new CG.const('WMS')),
            new CG.prop(
              'layers',
              new CG.str()
                .setTitle('WMS Layers', 'WMS-lag')
                .setDescription(
                  'Comma-separated list of one or more WMS layers to display. Sent as a prop to the WMS map server.',
                  'Kommaseparert liste over ett eller flere WMS-lag som skal vises. Sendes som en egenskap til WMS-kartserveren.',
                ),
            ),
            new CG.prop(
              'format',
              new CG.str()
                .optional({ default: 'image/jpeg' })
                .setTitle('Image Format', 'Bildeformat')
                .setDescription(
                  "The MIME type of the WMS tiles to request from the WMS server, as specified by the WMS standard. (use 'image/png' for layers with transparency).",
                  'MIME-typen for WMS-flisene som skal hentes fra WMS-serveren. Bruk «image/png» for lag med gjennomsiktighet.',
                ),
            ),
            new CG.prop(
              'version',
              new CG.str()
                .optional({ default: '1.1.1' })
                .setTitle('WMS Version', 'WMS-versjon')
                .setDescription(
                  'The version of the WMS standard to use',
                  'Versjonen av WMS-standarden som skal brukes.',
                ),
            ),
            new CG.prop(
              'transparent',
              new CG.bool()
                .optional({ default: false })
                .setTitle('Transparency', 'Gjennomsiktighet')
                .setDescription(
                  'Whether the WMS layer should be transparent',
                  'Angir om WMS-laget skal være gjennomsiktig.',
                ),
            ),
            new CG.prop(
              'uppercase',
              new CG.bool()
                .optional({ default: false })
                .setTitle('Uppercase', 'Store bokstaver')
                .setDescription(
                  'Whether the WMS parameters should be uppercase',
                  'Angir om WMS-parameterne skal skrives med store bokstaver.',
                ),
            ),
            new CG.prop('minZoom', new CG.num().optional({ default: 0 })),
            new CG.prop('maxZoom', new CG.num().optional({ default: 18 })),
          ).exportAs('MapWMSLayer'),
        )
          .setUnionType('discriminated')
          .exportAs('MapLayer'),
      ).optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'centerLocation',
      new CG.obj(
        new CG.prop('latitude', new CG.expr(ExprVal.Number)),
        new CG.prop('longitude', new CG.expr(ExprVal.Number)),
      )
        .optional()
        .exportAs('Location')
        .setTitle('Center location', 'Kartets midtpunkt')
        .setDescription('Center location of the map', 'Kartets midtpunkt.'),
    ),
  )
  .addProperty(new CG.prop('zoom', new CG.num().optional()))
  .addProperty(
    new CG.prop(
      'geometryType',
      new CG.enum('GeoJSON', 'WKT').optional({ default: 'GeoJSON' }).exportAs('IGeometryType'),
    ),
  )
  .addProperty(
    new CG.prop(
      'toolbar',
      new CG.obj(
        new CG.prop(
          'polyline',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setDescription(
              'Expression or boolean allowing the user to draw lines on the map',
              'Uttrykk eller boolsk verdi som angir om brukeren kan tegne linjer på kartet.',
            ),
        ),
        new CG.prop(
          'polygon',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setDescription(
              'Expression or boolean allowing the user to draw a polygon on the map',
              'Uttrykk eller boolsk verdi som angir om brukeren kan tegne et polygon på kartet.',
            ),
        ),
        new CG.prop(
          'rectangle',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setDescription(
              'Expression or boolean allowing the user to draw a rectangle on the map',
              'Uttrykk eller boolsk verdi som angir om brukeren kan tegne et rektangel på kartet.',
            ),
        ),
        new CG.prop(
          'circle',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setDescription(
              'Expression or boolean allowing the user to draw a circle on the map',
              'Uttrykk eller boolsk verdi som angir om brukeren kan tegne en sirkel på kartet.',
            ),
        ),
        new CG.prop(
          'marker',
          new CG.expr(ExprVal.Boolean)
            .optional({ default: false })
            .setDescription(
              'Expression or boolean allowing the user to place multiple markers on the map',
              'Uttrykk eller boolsk verdi som angir om brukeren kan plassere flere markører på kartet.',
            ),
        ),
      )
        .optional()
        .exportAs('Toolbar')
        .setTitle('Toolbar', 'Verktøylinje')
        .setDescription(
          'Sets which geometries the user is allowed to draw',
          'Angir hvilke geometrier brukeren kan tegne.',
        ),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'))
  .addSummaryOverrides();
