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
    asset: [
      // ["static", "your/public/in/burden"]
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
      let f = core.server.framework;
      var e = new f();
      e.use(f.json());
      e.use(f.urlencoded({ extended: true }));
      e.use(core.server.session(config.session || {}));

      let con = new handler(core, e, config);
      await con.init();

      e.listen(config.port);
      core.debug("Server is listening on Port:" + config.port);

      return con;
    }
  }

};
