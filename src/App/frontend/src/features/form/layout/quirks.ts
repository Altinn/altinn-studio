import type { ILayouts } from 'src/layout/layout';

/**
 * After the hierarchy generator rewrite, some apps in production broke badly because of misconfiguration. To make sure
 * we can still ship the rewrite, we need to apply some quirks/fixes to some layouts. This function applies those quirks
 * and warns about them.
 */
export function applyLayoutQuirks(layouts: ILayouts, layoutSetId: string) {
  const key = `${window.org}/${window.app}/${layoutSetId}`;
  const quirk = quirks[key];
  if (!quirk) {
    return layouts;
  }

  // Start off with a copy of the entire layouts that we'll throw away if anything fails
  const clone = structuredClone(layouts);

  try {
    quirk.verifyAndApply(clone);
    window.logError(
      `Layout quirk(s) applied: \n - ${quirk.logMessages.join('\n - ')}.\n` +
        `Please fix your layout configuration. These workarounds will be removed in the future.`,
    );
  } catch (_err) {
    return layouts;
  }

  // If we got here, the quirks were applied successfully
  return clone;
}

interface QuirkDef {
  verifyAndApply: (layouts: ILayouts) => void;
  logMessages: string[];
}

// Key format: 'org/app/layoutSetId' => QuirkDef
export const quirks: { [key: string]: QuirkDef } = {
  'digdir/tilskudd-dig-delt-komp/form': {
    verifyAndApply: (layouts) => {
      assert(layouts['03Description']![1].id === 'descriptionHeader');
      assert(layouts['pdfReceipt']![7].id === 'descriptionHeader');

      layouts['pdfReceipt']![7].id = 'descriptionHeaderPdfSummary';
    },
    logMessages: [`Renamed duplicate ID 'descriptionHeader' in 'pdfReceipt' layout to 'descriptionHeaderPdfSummary'`],
  },
  'lt/flight-hours/form-a': {
    verifyAndApply: (layouts) => {
      assert(layouts['Amount']![0].id === 'Header-RkBLKV');
      assert(layouts['Operator']![0].id === 'Header-RkBLKV');

      layouts['Operator']![0].id = 'Header-RkBLKVDuplicate';
    },
    logMessages: [`Renamed component id 'Header-RkBLKV' to 'Header-RkBLKVDuplicate' on page 'Operator'`],
  },
};

function assert(condition: boolean): asserts condition is true {
  if (!condition) {
    throw new Error('Quirk verification failed');
  }
}
