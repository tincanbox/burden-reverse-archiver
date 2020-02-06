/* Default server implementation.
 * You can completely overrides Server's behavior via this file.
 * (You prefer other frameworks? as you wish.)
 *
 * This Class should have only init() method to hook the server instantiation.
 */
const formidable = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const uuid = require('uuid');

module.exports = class {

  constructor(core, engine, config){
    this.core = core;
    this.config = config;
    this.engine = engine;
    this.code_list = require('./codes.json');
    /* Blocking URL RegExp list */
    this.block_list = [
      /*
      /favicon.ico$/
      */
    ];
  }

  /* @required
   */
  async init(/* pass what you want from config/server.prepare file. */){
    await this.bind_pre_middleware();
    await this.bind_route();
    await this.bind_post_middleware();
  }

  /* Closes express.Response with specific http-code.
   */
  async close(res, code, callback){
    let m = this.code_list.find((a) => { return a.code == (code + ""); });
    if(m){
      res.status(code || 500);
      if(callback){
        callback(res, m);
      }else{
        res.end(code + " " + m.phrase);
      }
    }
  }

  /* Binds pre-route middlewares.
   */
  async bind_pre_middleware(){
    // Global Handler
    this.engine.use('*', (req, res, next) => {
      /* DO SOME GLOBAL THINGS. */
      req.uuid = uuid();
      next();
    });
    // Bloking
    this.engine.use((req, res, next) => {
      // Blocks stupid request.
      let mt = this.block_list.filter((v) => {
        return req.url.match(v);
      });
      if(mt.length > 0){
        console.log("  -> Blocked");
        this.close(res, 403);
      }
      next();
    });
    // Assets
    if(this.config.asset && this.config.asset.length){
      try{
        let bs = this.core.config.path.burden;
        for(let f of this.config.asset){
          // [name, path]
          let nm = f[0], pt = f[1];
          let p = path.resolve( pt.match(/^\//) ? pt : bs + pt);
          let st = await fs.stat(p);
          if(!st.isDirectory(p))
            throw new Error("asset path is not a directory.");
          this.engine.use('/' + nm, this.core.server.framework.static(p));
          this.core.debug("asset path: " + nm + " => " + p);
        }
      }catch(e){
        this.core.log_error(new Error("Invalid asset-dir config: " + e.message));
      }
    }else{
      this.core.debug("sever.asset is disabled.");
    }
  }

  /* Binds post-route middlewares.
   */
  async bind_post_middleware(){
    // NOT matched at all.
    this.engine.use((req, res) => {
      this.close(res, 404);
    });
  }

  /* Binds basic route-groups.
   */
  async bind_route(){
    this.engine.use('/api/*', (req, res, next) => {
      res.type('json');
      next();
    });

    this.engine.get('/run/*', (req, res, next) => {
      res.type('json');
      this.redirect_request(req, res, next);
    });

    this.engine.post('/run/*', (req, res, next) => {
      res.type('json');
      this.retrieve_upload_file(req)
        .then(() => {
          this.redirect_request(req, res, next);
        })
    });

    this.engine.get('/*', (req, res) => {
      res.type('html');
      this.render_page("gui", req)
        .then((t) => {
          res.send(t);
        })
        .catch((e) => {
          this.close(res, 404, (res) => { res.end(e.message); });
        });
    });

    this.engine.post('/*', (req, res) => {
      res.type('html');
      this.render_page("gui", req, {post: req.body || {}})
        .then((t) => {
          res.send(t);
        })
        .catch((e) => {
          this.close(res, 404, (res) => { res.end(e.message); });
        });
    });

  }

  /* Retrieves uploaded files info as
   * {name_of_input: IncomingForm}
   */
  async retrieve_upload_file(req){
    return new Promise((resolve, reject) => {
      let f = new formidable.IncomingForm();
      f.parse(req, (err, fields, files) => {
        if(err){
          reject(err);
        }else{
          req.file = files;
          resolve(req);
        }
      });
    });
  }

  /* Redirects URL to core.recite().
   */
  async redirect_request(req, res){
    let t = req.url.replace(/^\/run\//, "");
    if(!t){
      res.status(404).end();
    }else{
      await this.core.tell(
        t,
        {...(req.query || {}), ...(req.body || {}), ...{request: req, response: res} }
      )
      .then((r) => res.json(r));
    }
  }

  /* Generates rendered HTML with template-path.
   */
  async render(pathcomp, data){
    let t = await this.core.template.read(pathcomp);
    let d = FM.ob.merge({}, {yield:"", data:{}}, data);
    let v = await this.core.template.render(t, d);
    return v;
  }

  /* Generates HTML as yielded contents with view/layout.
   */
  async render_page(group, req, param){
    let rg = new RegExp("^/" + group);
    let t = req.url.split("?").shift().replace(rg, "").replace(/^\//, "");
    t = "view/" + (t || "index");
    console.log("View Request:", t);
    let m = FM.ob.merge({
      token: req.uuid,
      query: req.query || {},
      post: req.body || {},
    }, param);
    let y = await this.render(t.split("/").filter(r => r), m);
    let l = await this.render(['view', 'layout'], Object.assign({
      yield: y
    }, m));
    return l;
  }

}
