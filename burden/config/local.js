/* Local configurations.
 * This file should not be included in versioning-repo.
 * Just make local.ENVNAME.js and manage separated local files.
 * Also, You can use .env file as an additional configuration file.
 * .env is not used to configurate this framework.
 * But handling the env-specific values with .env files is recommended
 * to clear the contents availability.
 * See also burden/.env.default file.
 */

module.exports = {

  label: process.env.APPNAME || "YOURAPPNAME",
  stage: process.env.ENVIRONMENT || "devel",

}
