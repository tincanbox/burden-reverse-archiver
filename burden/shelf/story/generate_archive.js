const fs = require('fs');
const fsp = fs.promises;
const fsx = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const yauzl = require('yauzl');
const decompress = require('decompress');
const uuid = require('uuid');
const iconv = require('iconv-lite');
const unzipper = require('unzipper');
const EncodingJP = require('encoding-japanese');

const Story = disc('class/Story');

module.exports = class extends Story {

  constructor(core){
    super(core);
    this.compose([
      "main"
    ]);

    this.replacer = {
      nogroup: {
        label: 'attachment'
      },
      file: [
      ],
      directory: [
      ]
    };

    this.keep_limit = 40;
    this.entry_name_hier_glue_char = "__";

    this.path = {};
    this.path.storage = this.core.config.path.app + path.sep + 'storage';
  }

  /*
   */
  async chapter_main(param){

    console.log("param =", param);

    if(!param.mode){
      this.abort("invalid mode");
    }

    console.log(param.mode, "-----------------------------------");

    if(!param.token){
      this.abort("invalid request");
    }

    param.token = param.token.replace(path.sep, "-");

    if(param.replacer){
      for(let r of param.replacer){
        (r.from) && this.replacer.file.push([new RegExp(r.from, "g"), r.to]);
        (r.from) && this.replacer.directory.push([new RegExp(r.from, "g"), r.to]);
      }
    }
    this.replacer.file.push([/(　| )/g, ""]);
    this.replacer.directory.push([/(　| )/g, ""]);

    this.path.working = this.path.storage + path.sep + param.token;
    this.path.content = this.path.working + path.sep + 'content';
    this.path.result = this.path.working + path.sep + "result";

    await this.rotate_directory(this.path.storage, this.keep_limit);
    await this.rotate_directory(this.scene.argument.server.config.path.expose.bucket, this.keep_limit);

    this.format = {
      group_name: param.group_name_format || "%name%",
      entry_name: param.entry_name_format || "%hier%"
    };

    this.entry_name_hier_glue_char = param.entry_name_hier_glue_char || this.entry_name_hier_glue_char;

    console.log("replacer = ", this.replacer);
    console.log("format = ", this.format);

    let mode = param.mode;
    try{
      switch(mode){
        case "estimate_result":
          var r = await this.fetch_dest_info(param);
          return {
            est: r
          };
          break;
        case "pack":
          var r = await this.action_generate_result(param);
          if(r.download_path){
            let res = this.scene.argument.response
            let fn = param.token + '.zip';
            let dp
              = this.scene.argument.server.config.path.expose.bucket
                + path.sep + fn;
            await fsx.copy( r.download_path, dp);
            return {
              download_path: "bucket?file=" + fn
            };
          }
          break;
        case "unpack":
          var r = await this.action_decompress_file(param);
          /*
           */
          var tree = await this.build_decompressed_structure(r);
          return {
            count: r.length,
            structure: tree
          };
          break;
        default:
          this.abort("invalid proc mode");
      }
    }catch(e){
      console.error(e);
      throw e;
    }

  }

  async action_generate_result(param){
    try{
      await fsx.remove(this.path.result);
      await fsx.mkdirp(this.path.result);
    }catch(e){
      console.error(e);
    }

    /*==================================================
    */
    var result = await this.fetch_dest_info(param);

    for(let o of result){

      console.log("----------");
      console.log(o.name);

      if(param.toggle_archive_each_content){
        await this.pack('zip', { zlib: { level: 9 } },
          this.path.result + path.sep + o.format + '.zip',
          o.files.map((ov, i) => {
            return [ov.path, ov.format + ov.ext]
          })
        );
      }else{
        var p = this.path.result + path.sep + o.format;
        var i = 0;
        await fsx.mkdirp(p);
        for(var f of o.files){
          await fsx.copy(f.path, p + path.sep + f.format + f.ext);
          i++;
        }
      }
    }

    let dest_comp_file_path = this.path.working + path.sep + 'download.zip';
    try{
      await fsx.remove(dest_comp_file_path);
    }catch(e){
      //
    }

    await this.pack('zip', { zlib: { level: 9 } },
      dest_comp_file_path,
      this.path.result
    );

    result.download_path = dest_comp_file_path;

    return result;
  }

  async action_decompress_file(param){
    // Unzip uploaded file.
    await fsx.remove(this.path.content);
    await fsx.mkdirp(this.path.content);
    await fsx.remove(this.path.result);
    await fsx.mkdirp(this.path.result);

    if(!param.file.archive){
      throw new Error("Empty");
    }
    if([
      "application/zip",
      "application/octet-stream",
      "application/x-zip-compressed",
      "multipart/x-zip"
    ].indexOf(param.file.archive.type) < 0){
      throw new Error("Only ZIP is supported. => " + param.file.archive.type);
    }
    console.log("fuck");
    let r = await this.unpack(param.file.archive, this.path.content);
    return {
      token: param.token,
      data: r
    };
  }

  async build_decompressed_structure(r){
    var tree = { content:[] };
    for(var p of r.data){
      var rpr = p.replace(this.path.content, "");
      var rprsp = rpr.split(path.sep).filter(a => a);
      var dp = 0;
      var pr = tree;
      for(var en of rprsp){
        var eno = {
          name: en,
          content: []
        };
        if(rprsp[dp + 1]){
          var m = null;
          for(var cn of pr.content){
            if(cn.name == en){
              m = cn;
              break;
            }
          }
          if(m){
            eno = m;
          }else{
            eno.type = "dir";
            pr.content.push(eno);
          }
          pr = eno;
          // has next
        }else{
          eno.type = "file";
          pr.content.push(eno);
          break;
        }
        dp++;
      }
    }

    return tree;
  }

  /*
   */
  async pack(type, opt, dest_archive_path, entry_list, callback){
    // create a file to stream archive data to.
    return new Promise((res, rej) => {
      let output = fs.createWriteStream(dest_archive_path);
      let archive = archiver(type, opt);

      // listen for all archive data to be written
      // 'close' event is fired only when a file descriptor is involved
      output.on('finish', function(){
        res(true);
      });
      output.on('end', function(){
        res(true);
      });

      // good practice to catch warnings (ie stat failures and other non-blocking errors)
      archive.on('warning', function(err) {
        console.error(err);
        if(err.code === 'ENOENT'){
        }else{
          // throw error
          throw err;
        }
      });

      archive.on('error', function(err) {
        console.error(err);
        throw err;
      });

      // append a file from stream
      if(typeof entry_list == "string"){
        archive.directory(entry_list, false);
      }else{
        for(let f of entry_list){
          let op = { name: f[1] };
          let st;
          try{
            st = fs.createReadStream(f[0]);
          }catch(e){
            console.error(e);
          }
          archive.append(st, op);
        }
      }

      archive.pipe(output);

      // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
      archive.finalize();
    });
  }

  /*
   */
  async unpack(file, dest_dir){
    let files = [];
    let zip_file_path = file.path;
    let trail = (new RegExp("(\\\\|/)$"));
    let zip_fnsp = file.name.split(".");
    let zip_fext = zip_fnsp.pop();
    let zip_fbsn = zip_fnsp.join(".");
    let zip_fbsn_reg = new RegExp("^" + zip_fbsn);
    return new Promise((res, rej) => {
      fs.createReadStream(zip_file_path)
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          /*==============================
           * Main Parser
           *==============================
           */
          try{
            let enc = EncodingJP.detect(entry.props.pathBuffer);
            let f = iconv.decode(entry.props.pathBuffer, enc);
            console.log("unpack entry: ", f);
            if(trail.test(f)){
              await fsp.mkdir(dest_dir + path.sep + f);
              entry.autodrain();
            }else{
              let fnsp = f.split(".");
              let fext = fnsp.pop();
              let fbsn = fnsp.join(".");
              console.log("  -> fbsn:", fbsn);
              console.log("  -> zipf:", zip_fbsn);
              /* sample.zip/foo.pdf
               * should be...
               * foo/sample.pdf ???
               */
              let p = dest_dir + path.sep + (
                f
                //(fbsn == zip_fbsn) ? f : f.replace(zip_fbsn_reg, "")
              );
              await fsx.mkdirp(path.dirname(p));
              entry.pipe(fs.createWriteStream(p));
              files.push(p);
            }
          }catch(e){
            entry.autodrain();
          }
        })
        .promise()
        .then((r) => {
          res(files);
        })
        .catch((e) => {
          console.error(e);
          rej(e);
        })
      ;
    })
  }

  replace_entry(type, v){
    for(let replace_config of this.replacer[type]){
      let c = v.replace(replace_config[0], replace_config[1]);
      v = c;
    }
    return v;
  }

  async fetch_dest_info(param){
    var result = [];
    // expects the structure: /GROUPNAME/USERNAME.ext
    this.monolog("step", "checking base dir");

    // Shared vars.
    let base = this.path.content;
    let entry_list = await fsp.readdir(this.path.content);

    // auto-dig dup cmp
    if(entry_list.length == 1){
      let top_name = entry_list[0];
      let ps = this.path.content + path.sep + top_name;
      let st = await fsp.stat(ps);
      // This zip has ONLY one entry which is a Directory.
      // Digs automatically.
      if(st.isDirectory()){
        base = base + path.sep + top_name;
        entry_list = await fsp.readdir(ps);
      }else{
      }
    }

    let nogroup_dd = path.dirname(this.path.content) + path.sep + this.replacer.nogroup.label;

    await fsx.remove(nogroup_dd);
    await fsx.mkdirp(nogroup_dd);

    this.monolog("step", "before dirs");
    /* Handling the files which directly-allocated within a directory.
     *
     * sample.zip/Mr_A.txt
     * => Mr_A/Attachment.txt
     *           ^ this is "nogroup.label"
     *
     */
    for(let entry_name of entry_list){
      let entry_path = base + path.sep + entry_name;
      let st = await fsp.stat(entry_path);

      if(st.isDirectory()){
        // Directory
        result  = await this.generate_converted_structure(result, entry_path);
      }else{
        // File
        // pre-builds directory for nogrouped files.
        await fsp.copyFile(entry_path, nogroup_dd + path.sep + entry_name);
        continue;
      }
    }

    /* pushes nogrouped files-info to result.
     */
    try{
      let nogroup_files = await fsp.readdir(nogroup_dd);
      if(nogroup_files.length){
        result  = await this.generate_converted_structure(result, nogroup_dd);
      }
    }catch(e){
      //
    }

    return result;
  }

  async generate_converted_structure(dict, entry_path, inherit_hier){

    let hier = inherit_hier ? inherit_hier.slice() : [];
    let entry_comp = entry_path.split(path.sep);
    let entry_name = entry_comp.pop();

    /* finding priory-grouping-key.
     */
    let dir = this.replace_entry('directory', entry_name);

    if(!dir){
      throw new Error("invalid content dir name: " + entry_name);
    }

    hier.push(dir);

    let sub_entry_list = await fsp.readdir(entry_path);
    for(let sub_entry_name of sub_entry_list){
      let h_r = hier.slice();
      let sub_entry_path = entry_path + path.sep + sub_entry_name;
      let st = await fsp.stat(sub_entry_path);

      // Recursion.
      if(st.isDirectory()){
        dict = await this.generate_converted_structure(dict, sub_entry_path, h_r);
        continue;
      }

      // renaming filename
      let id;
      let idsp = sub_entry_name.split(".");
      let pp = idsp.pop(); // Trims shitty ext.
      id = (idsp.length > 0) ? idsp.join(".") : pp;
      id = this.replace_entry('file', id);

      /*
       */
      var mt = null;
      for(var dik of dict){
        if(dik.name == id){
          mt = dik;
          break;
        }
      }

      /* pushing empty-entry-container for later use */
      if(!mt){
        mt = {
          name: id,
          orig: sub_entry_name,
          format: "",
          hier: h_r,
          files: []
        };
        dict.push(mt);
      }

      var ent = {
        directory: dir,
        format: "",
        ext: "",
        hier: h_r,
        orig: sub_entry_name,
        path: sub_entry_path
      };

      ent.ext = path.extname(ent.path);
      mt.files.push(ent);
    }

    for( var d_i = 0; d_i < dict.length; d_i++ ){
      // Group Format
      var d = dict[d_i];
      d.format
        = this.format.group_name
        .replace("%name%", d.name)
        .replace("%count%", d.files.length)
        .replace("%number%", d_i + 1)
      ;

      // Entry Format
      for(var i = 0; i < d.files.length; i ++){
        var ent = d.files[i];
        ent.format
          = this.format.entry_name
          .replace("%hier%", ent.hier.join(this.entry_name_hier_glue_char))
          .replace("%group%", d.name)
          .replace("%group_format%", d.format)
          .replace("%directory%", ent.directory)
          .replace("%number%", d_i + 1)
          .replace("%index%", i + 1)
        ;
        ent.format = ent.format.replace(/_$/, "");
      }
    }


    return dict;
  }


  async rotate_directory(dir, limit){
    let ens = await fsp.readdir(dir);
    let dd = [];
    let lm = limit || 40;

    for(let en of ens){
      let pt = dir + path.sep + en;
      let st = await fsp.stat(pt);
      dd.push({
        path: pt,
        mtime: st.mtime.getTime()
      });
    }

    dd = dd.sort((a, b) => {
      return (a.mtime < b.mtime) ? 1 : -1;
    });

    if(dd.length > lm){
      return Promise.all(dd.slice(lm || 5).map((a) => {
        return new Promise((res, rej) => {
          console.log("Removing old files =>", a.path);
          fsx.remove(a.path).then(res).catch(rej);
        })
      })).catch((e) => {
        console.error(e);
      });
    }

    return true;
  }


}
