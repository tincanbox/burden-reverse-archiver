module.exports = [
  /*
   * Each configuration should be based on Scene definition.
   *
   */
  // Call story/sample
  {
    /* A name of calling Story file.
     * Check shelf/story/sample/yahoo-news file.
     */
    story: 'sample.yahoo-news',
    /* Automatically opens Page OR BrowserContext on Story initialization.
     * Set false if you want to pause.
     * default = true
     */
    autoload: true,
    /* Keep specific named cookies state.
     * if this is empty, `default` is supplied.
     * default = "default"
     */
    session: "default",
    /* Retry-count when a normal Exception is thrown.
     * 3 means... 1 normal + 3 retries = 4 total executions
     * default = 0
     */
    retry: 1,
    /* As default, colloquist closes opened Page & BrowserContext when Story process is done.
     * default = false
     */
    keep: false,
    /* On parallel execution, colloquist opens a Page as next workspace.
     * Set true if you want to run JavaScript evalization with separated instance.
     * default = false
     */
    isolated: true,
    /* This parameter will be passed to chapter methods on Story extensions.
     * default = {}
     */
    premise: {
      /* You can call this `parameter` in another word.
       * Put what you want, will be passed as the chapter_*'s second argument.
       *
       * something: 123
       */
    }
  }

  /* Array means parallel execution
   * ["DoSomethin01", "DoAnotherthin02"]
   */

  /* String means Uri protocol
   *
   * "story://sample?test=2"
   * => {
   *   story: "sample",
   *   premise: {
   *     test: "2"
   *   }
   * }
   */
];
