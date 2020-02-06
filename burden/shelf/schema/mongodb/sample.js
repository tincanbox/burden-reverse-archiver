module.exports = function(name, conn, option){

  /* name = Name of this file without ext
   * handler = Instantiated Engine.
   * option = factory.option from config/STAGE/database.js
   */

  return conn.handler.model(name, new conn.engine.Schema(
    {
      label: String
    },
    {
      collection: name
    }
  ));
};
