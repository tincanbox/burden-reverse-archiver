module.exports = {

  /*
   * {
   *   engine: String = handler-module name for require() arg. mongoose|sequelize or what you want.
   *
   *   # Generates uri property.
   *   # You can access config.uri property when calling connect() method in this configuration.
   *   protocol:
   *   host:
   *   port:
   *   database:
   *
   *   handler: {
   *     option: object
   *     init: asyncfunction
   *   }
   *   factory: {
   *     option: object
   *     init: asyncfunction
   *   }
   *
   *   connect: (DatabaseInstance, config:object) => Connection Handler
   *
   *   # Model collection with indexed by model name.
   *   # Each require()'d file should be forms of (name, engine, connection, config) => Model .
   *   factory: (core.database, connection, config:object)
   * }
   */

  /* A sample of SQLite
   * Uses Sequelize module as a handler.
   * see, https://sequelize.org/v5/
   */
  "sqlite": {
    engine: "sequelize",
    protocol: "sqlite",
    user: "",
    password: "",
    handler: {
      option: {
        logging: false,
        dialect: "sqlite",
        storage: "/data/sqlite3/sample"
      },
      /*
      init: function(name, engine, handler, option){
        return YOUR_OWN_HANDLER;
      }
      */
    },
    factory: {
      option: {
        // The name of the model. The model will be stored in `sequelize.models`
        // under this name.
        // This defaults to class name i.e. Bar in this case.
        // This will control name of auto-generated
        // don't add the timestamp attributes (updatedAt, createdAt)
        timestamps: true,

        // don't delete database entries but set the newly added attribute deletedAt
        // to the current date (when deletion was done). paranoid will only work if
        // timestamps are enabled
        paranoid: true,

        // Will automatically set field option for all attributes to snake cased name.
        // Does not override attribute with field option already defined
        underscored: true,

        // disable the modification of table names; By default, sequelize will automatically
        // transform all passed model names (first parameter of define) into plural.
        // if you don't want that, set the following
        freezeTableName: true,

        // Enable optimistic locking.  When enabled, sequelize will add a
        // version count attribute
        // to the model and throw an OptimisticLockingError error
        // when stale instances are saved.
        // Set to true or a string with the attribute name you want to use to enable.
        version: true,

        // If you want sequelize to handle timestamps,
        // but only want some of them, or want your timestamps to be called something else,
        // you can override each column individually:
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',

      },
      /*
      init: function(ins, conn, config){
      }
      */
    }
  },

  /* A sample of MongoDB connection.
   */
  "mongodb": {
    engine: "mongoose",
    protocol: "mongodb",
    host: "localhost",
    port: 27017,
    database: "sample",
    handler: {
      option: {
        user: "",
        pass: "",
        useNewUrlParser: true,
        useUnifiedTopology: true
      },
      /* Builds an ORM Connection object.
      init: async function(ins, config){
        return ins.default_connection(config);
        // If you dont use multiple connections, you can also use connect() method.
        // return ins.engine.mongoose.connect(config.uri, config.option);
      }
     */
    },
    factory: {
      option: {
        toObject: {
          retainKeyOrder: true
        },
        toJSON: {
          retainKeyOrder: true
        }
      },
      /* Builds ORM Model objects.
      init: async function(ins, conn, config){
        // Do Your Thing.
        return await ins.factory("mongodb", config);
      }
      */
    }
  }
};
