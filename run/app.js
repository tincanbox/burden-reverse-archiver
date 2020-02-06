#!/usr/local/bin/node
const path = require('path');

/* Very simple app with colloquist.
 */
(async () => {

  /* Instantiates colloquist with burden dir configuration.
   */
  var c = new (require('colloquist'))({
    // Set a path which includes burden dir.
    burden: path.resolve([__dirname, '..', 'burden'].join(path.sep))
  });

  /* Start colloquist basics.
   */
  await c.open({
    /* additional configurations like...
     * path, puppet, database.
     */
  });

  /* Run story manually.
   */
  await c.execute();

})();
