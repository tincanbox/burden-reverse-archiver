module.exports = {
  /* Uses express as main server.
   * http://expressjs.com/en/5x/api.html#router
   *
   * You can separate the server configurations define like `default`.
   */
  default: {
    /*
     */
    port: 9000,

    /* string with an adjective `/` will be treated as the absolute-path.
     * /abs/to/your/dir
     *
     * string starting with non-`/` char will be treated as the relative-path from `burden`.
     * your/pub/in/burden
     */
    expose: [
      ["asset", "shelf/server/public/asset"],
      ["bucket", "shelf/server/public/bucket"],
    ],

    session: {
      secret: 'YOURSECRET',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: true }
    },

    /* Adaptor for the shelf/server/default instance.
     */
    prepare: async (core, handler, config) => {
      /* Do Your Things. */
      let con = new handler(core, config);
      await con.init();
      return con;
    }
  }

};
