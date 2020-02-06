/* Configurations for Puppeteer
 */
module.exports = {
  /* As ver 1.1.0, colloquist uses puppeteer-core as a handler.
   * You should install Chromium and specify the executablePath before use.
   *
   * takes: string
   * default: null
   */
  "executable": null,
  /* As default, colloquist uses Puppeteer as headless background worker.
   * You can toggle this opetion via cli arg `--gui` or `--headless`
   *
   * takes: boolean
   * default: true
   */
  "headless": true,
  /* Chromium has default-viewport 800x600 GUI.
   * colloquist disables defaults and maxes out view.
   */
  "viewport": null,
  "display": {
    "width": false,
    "height": false
  },
  /* This flag activates userDataDir automatically.
   * Default dest path is `/tmp/colloquist_storage.%YOURMACADDRES%/`.
   * You can overrides this config via `override` property.
   *
   * takes: boolean
   * default: true
   */
  "keep_userdata": true,
  /* Puppeteer's launch options
   * See chromium docs.
   *
   * takes: [string],
   * default: []
   */
  "arg": [
    // --no-sandbox
  ],
  /* If you want to override default UA, use this option.
   * Safari, Firefox, IE ?
   *
   * takes: string
   * default: false
   */
  "useragent": false,
  /* Actually this option is used within Scenario.
   * Scenario class handles concurrent-working story queue counts.
   * Increasing this means.. Raised number of concurrent Puppeteer Page or BrowserContext.
   * The isolated Scene always opens new BrowserContext,
   * while default Scene uses same BrowserContext and opens a Page instance.
   * See Scene.open() for detailed behaivior.
   */
  "max_concurrent_work": 2,
  /* Blocks specific contents via Page's `request` event.
   * type - image
   * url  - regexp
   */
  "block": {
    /* blocks content with its type.
     */
    "type": [
      // Puppeteer request type: like 'image'
    ],
    /* blocks content with RegExp string.
     */
    "url": [
      // Regex pattern list
    ]
  },
  "override": {}
}
