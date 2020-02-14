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

  constructor(core, config){
    this.core = core;
    this.config = config;
    this.engine = new this.core.server.framework;
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

    let e = this.engine;

    //e.use(this.core.server.framework.json());
    //e.use(this.core.server.framework.urlencoded());
    e.use(this.core.server.session(this.config.session || {}));

    await this.bind_pre_middleware();
    await this.bind_route();
    await this.bind_post_middleware();

    e.listen(this.config.port);
    this.core.debug("Server is listening on Port:" + this.config.port);
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
    this.engine.use((req, res, next) => {
      /* DO SOME GLOBAL THINGS. */
      console.log("Requested URL: ", req.url);
      req.token = uuid();
      req.body = req.body || {};
      req.query = req.query || {};
      //
      if(this.config.url_auth){
        var sig = this.config.url_auth.split(":");
        if(sig.length < 2){
          sig = ["SIGNATURE", sig[0]];
        }
        if(!req.query[sig[0]] || req.query[sig[0]] != sig[1]){
          this.close(res, 403);
          return;
        }
      }
      next();
    });
    // BASIC auth
    if(this.config.auth.basic && this.config.auth.basic.length){
      this.engine.use((req, res, next) => {
        // parse login and password from headers
        const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
        const [usr, psw] = new Buffer(b64auth, 'base64').toString().split(':');
        // Verify login and password are set and correct
        var cred = this.config.auth.basic;
        if(typeof cred === 'string')
          cred = [cred];
        for(var au of cred){
          if(typeof au === 'string')
            au = au.split(":");
          if (usr && psw && (usr === au[0]) && (psw === au[1]))
            return next()
        }
        // Access denied
        res.set('WWW-Authenticate', 'Basic realm="401"');
        return this.close(res, 401);
      });
    }
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
    this.engine.use((req, res, next) => {
      this.retrieve(req)
        .then(() => {
          next();
        })
        .catch((e) => {
          this.core.log_error(e);
        })
    })
    // Assets
    if(this.config.expose && this.config.expose.length){
      try{
        let bs = this.core.config.path.burden;
        for(let f of this.config.expose){
          // [name, path]
          let nm = f[0], pt = f[1];
          let p = path.resolve(pt.match(/^\//) ? pt : bs + pt);
          let st = await fs.stat(p);
          if(!st.isDirectory(p))
            throw new Error("asset path is not a directory.");
          this.engine.use('/' + nm, this.core.server.framework.static(p));
          this.config.path = this.config.path || {};
          this.config.path.expose = this.config.path.expose || {};
          this.config.path.expose[nm] = p;
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
      this.redirect_request(req, res, next);
    });

    this.engine.post('/run/*', (req, res, next) => {
      this.redirect_request(req, res, next);
    });

    this.engine.get('/bucket', (req, res) => {
      if(req.query.file){
        res.download(this.config.path.expose.bucket + path.sep + req.query.file);
        return;
      }
      this.close(res, 404);
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
          this.close(res, 404, (res) => { this.send_error(res, e); });
        });
    });

  }

  async send_error(res, content){
    let msg;
    if(content instanceof Error){
      msg = content.message;
    }
    if(typeof content == "string"){
      msg = content;
    }
    msg = JSON.stringify(content);
    switch(res.type){
      case 'html':
        res.end(msg);
        break;
      case 'json':
        res.json({ error: msg });
        break;
    }
    return true;
  }

  /* Retrieves posted form-data
   */
  async retrieve(req){
    return new Promise((resolve, reject) => {
      let form = new formidable.IncomingForm();
      let fds = [];
      // Events
      form
        .on('field', function (k, v) {
          fds.push([k, v]);
        })
        .on('error', function(err){
          console.error("ServerFormParseError: ", err.message);
          console.error(err);
          reject(err);
        })
        .on('file', function (field, file) {
          req.file = req.file || {};
          req.file[field] = file;
        })
        .on('aborted', function (err) {
          console.log("Aborted", err);
        })
        .on('end', function () {
          let o = FM.ob.unserialize(fds);
          req.body = Object.assign(req.body || {}, o);
        });
      // lets go
      form.parse(req, (err /*, fields, files */) => {
        if(err){
          reject(err);
        }else{
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
      let p = {...(req.query || {}), ...(req.body || {}), ...{file: req.file || {}} };
      // Scene arguments.
      let c = { enumerable: false, configurable: false };
      Object.defineProperty(p, 'server', Object.assign({value: this}, c));
      Object.defineProperty(p, 'request', Object.assign({value: req}, c));
      Object.defineProperty(p, 'response', Object.assign({value: res}, c));
      // Lets go.
      await this.core.tell(t, p)
      .then((r) => {
        res.type('json');
        return res.json({
          data: r
        })
      })
      .catch((e) => {
        res.type('json');
        return res.json({
          error: e
        });
      });
    }
  }

  /* Generates rendered HTML with template-path.
   */
  async render(pathcomp, data){
    let d = FM.ob.merge({}, {yield:"", data:{}}, data);
    let r = await this.core.template.load(pathcomp, d);
    return r;
  }

  /* Generates HTML as yielded contents with view/layout.
   */
  async render_page(group, req, param){
    let rg = new RegExp("^/" + group);
    let t = req.url.split("?").shift().replace(rg, "").replace(/^\//, "");
    t = "view/" + (t || "index");
    let m = FM.ob.merge({
      token: req.token,
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
