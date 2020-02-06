/* ini.js
 * This file should include all path definitions
 * to initialize `colloquist` requisities.
 * (e.g. drafts, server, mail... so on)
 */
const path = require('path');

let e = {path: {}};

e.path.app = path.resolve([__dirname, '..'].join(path.sep)) + path.sep;
e.path.log = e.path.app + 'log' + path.sep;
e.path.burden = e.path.app + 'burden' + path.sep;
e.path.config = e.path.burden + 'config' + path.sep;
e.path.shelf = e.path.burden + 'shelf' + path.sep;
e.path.story = e.path.shelf + 'story' + path.sep;
e.path.draft = e.path.shelf + 'draft' + path.sep;
e.path.schema = e.path.shelf + 'schema' + path.sep;
e.path.template = e.path.shelf + 'template' + path.sep;

module.exports = e;
