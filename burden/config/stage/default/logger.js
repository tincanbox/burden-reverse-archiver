module.exports = {

  /* Maximum level of logger engine.
   *  emerg:     0,
   *  alert:     10,
   *  crit:      20,
   *  error:     30,
   *  warning:   40,
   *  notice:    50,
   *  info:      60,
   *  debug:     70,
   *  trace:     99,
   *  //
   *  dictation: 1,
   */
  level: 'all',

  output: ['console', 'file', /* 'database:mongodb' */],

  /* Rotation configulation.
   */
  rotation: {
    size: '20m',
    term: '14d',
    count: {
      dictation: 100
    }
  },

}
