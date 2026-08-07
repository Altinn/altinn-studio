import React from 'react';

import { Loader } from 'src/core/loading/Loader';
import { clientLoader } from 'src/routes/index/stateless-index.loader';

export { clientLoader };

export default function StatelessIndex() {
  return <Loader reason='stateless-redirect' />;
}
