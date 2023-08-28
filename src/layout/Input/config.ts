import { CG, Variant } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Form,
  rendersWithLabel: true,
  capabilities: {
    renderInTable: true,
    renderInButtonGroup: false,
    renderInAccordion: false,
    renderInAccordionGroup: false,
  },
})
  .addDataModelBinding(CG.common('IDataModelBindingsSimple').optional({ onlyIn: Variant.Internal }))
  .addProperty(new CG.prop('saveWhileTyping', CG.common('SaveWhileTyping').optional({ default: true })))
  .addProperty(
    new CG.prop(
      'formatting',
      new CG.obj(
        // Newer Intl.NumberFormat options
        new CG.prop(
          'currency',
          new CG.enum(
            ...['AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN'],
            ...['BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BOV', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF'],
            ...['CHE', 'CHF', 'CHW', 'CLF', 'CLP', 'CNY', 'COP', 'COU', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF'],
            ...['DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD'],
            ...['GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD'],
            ...['JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR'],
            ...['LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK'],
            ...['MXN', 'MXV', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK'],
            ...['PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK'],
            ...['SGD', 'SHP', 'SLE', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT'],
            ...['TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'USN', 'UYI', 'UYU', 'UYW', 'UZS'],
            ...['VED', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XDR', 'XOF', 'XPF', 'XSU', 'XUA', 'YER', 'ZAR'],
            ...['ZMW', 'ZWL'],
          )
            .optional()
            .setTitle('Language-sensitive currency formatting')
            .setDescription(
              'Enables currency to be language sensitive based on selected app language. Note: parts that ' +
                'already exist in number property are not overridden by this prop.',
            ),
        ),
        new CG.prop(
          'unit',
          new CG.enum(
            ...['celsius', 'centimeter', 'day', 'degree', 'foot', 'gram', 'hectare', 'hour', 'inch', 'kilogram'],
            ...['kilometer', 'liter', 'meter', 'milliliter', 'millimeter', 'millisecond', 'minute', 'month'],
            ...['percent', 'second', 'week', 'year'],
          )
            .optional()
            .setTitle('Language-sensitive number formatting based on unit')
            .setDescription(
              'Enables unit along with thousand and decimal separators to be language sensitive based on ' +
                'selected app language. They are configured in number property. Note: parts that already exist ' +
                'in number property are not overridden by this prop.',
            ),
        ),
        new CG.prop(
          'position',
          new CG.enum('prefix', 'suffix')
            .optional()
            .setTitle('Position of the currency/unit symbol')
            .setDescription(
              'Display the unit as prefix or suffix. Default is prefix. (Use only when using currency or unit options)',
            ),
        ),

        // Older options based on react-number-format
        new CG.prop(
          'number',
          new CG.union(
            new CG.obj(
              new CG.prop('format', new CG.str()),
              new CG.prop('mask', new CG.union(new CG.str(), new CG.arr(new CG.str())).optional()),
              new CG.prop('allowEmptyFormatting', new CG.bool().optional()),
              new CG.prop('patternChar', new CG.str().optional()),
            ).exportAs('PatternFormatProps'),
            new CG.obj(
              new CG.prop('thousandSeparator', new CG.union(new CG.bool(), new CG.str()).optional()),
              new CG.prop('decimalSeparator', new CG.str().optional()),
              new CG.prop('allowedDecimalSeparators', new CG.arr(new CG.str()).optional()),
              new CG.prop('thousandsGroupStyle', new CG.enum('thousand', 'lakh', 'wan', 'none').optional()),
              new CG.prop('decimalScale', new CG.num().optional()),
              new CG.prop('fixedDecimalScale', new CG.bool().optional()),
              new CG.prop('allowNegative', new CG.bool().optional()),
              new CG.prop('allowLeadingZeros', new CG.bool().optional()),
              new CG.prop('suffix', new CG.str().optional()),
              new CG.prop('prefix', new CG.str().optional()),
            )
              .exportAs('NumberFormatProps')
              .setTitle('Number formatting options')
              .setDescription(
                'These options are sent directly to react-number-format in order to make it possible to format pretty numbers in the input field.',
              ),
          ).optional(),
        ),
        new CG.prop('align', new CG.enum('right', 'center', 'left').optional({ default: 'left' })),
      )
        .optional()
        .exportAs('IInputFormatting')
        .addExample({
          currency: 'NOK',
        })
        .addExample({
          number: {
            thousandSeparator: ' ',
            decimalSeparator: ',',
            allowNegative: false,
            suffix: ' kr',
          },
        }),
    ),
  )
  .addProperty(
    new CG.prop(
      'variant',
      new CG.enum('text', 'search')
        .optional({ default: 'text' })
        .setTitle('Input variant')
        .setDescription('The variant of the input field (text or search).'),
    ),
  )
  .addProperty(new CG.prop('autocomplete', CG.common('HTMLAutoCompleteValues').optional()))
  .addProperty(
    new CG.prop(
      'maxLength',
      new CG.int()
        .optional()
        .setTitle('Max length')
        .setDescription(
          'Max length of the input field. Will add a counter to let the user know how many characters are left.',
        ),
    ),
  );
