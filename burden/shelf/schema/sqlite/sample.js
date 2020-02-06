module.exports = function(name, conn, option){
  var M = class extends conn.engine.Model {}

  /* name = Name of this file without ext
   * conn = Instantiated Engine.
   * option = factory.option from config/STAGE/database.js
   */

  /* create table sample (
   *   id INTEGER PRIMARY KEY,
   *   label TEXT,
   *   created_at DATETIME,
   *   updated_at DATETIME,
   *   deleted_at DATETIME,
   *   version INTEGER
   * )
   *
   */

  M.init({
    label: conn.engine.DataTypes.STRING
  }, option);

  return M;
}
