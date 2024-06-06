import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: true,
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
    renderInCards: false,
    renderInCardsMedia: false,
  },
})
  .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional())
  .addProperty(
    new CG.prop(
      'layers',
      new CG.arr(
        new CG.obj(
          new CG.prop(
            'url',
            new CG.str()
              .setTitle('Map layer url')
              .setDescription(
                'Url to a map tile. {z}/{x}/{y} will be replaced with tile coordinates, {s} will be ' +
                  'replaced with a random subdomain if subdomains are given',
              ),
          ),
          new CG.prop(
            'attribution',
            new CG.str()
              .optional()
              .setTitle('Attribution')
              .setDescription('Ascribing a work or remark to a particular unit for recognition'),
          ),
          new CG.prop(
            'subdomains',
            new CG.arr(new CG.str())
              .optional()
              .setTitle('Subdomains')
              .setDescription(
                'List of subdomains. Used for balancing the load on different map tiling servers. ' +
                  'A random one will replace {s} in the defined url.',
              ),
          ),
        ).exportAs('MapLayer'),
      ).optional(),
    ),
  )
  .addProperty(
    new CG.prop(
      'centerLocation',
      new CG.obj(new CG.prop('latitude', new CG.num()), new CG.prop('longitude', new CG.num()))
        .optional()
        .exportAs('Location')
        .setTitle('Center location')
        .setDescription('Center location of the map'),
    ),
  )
  .addProperty(new CG.prop('zoom', new CG.num().optional()));
