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
      file: [
      ],
      directory: [
      ]
    };

    this.keep_limit = 40;

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

    if(!param.token){
      this.abort("invalid request");
    }

    param.token = param.token.replace(path.sep, "-");

    if(param.replacer){
      for(let r of param.replacer){
        this.replacer.file.push([new RegExp(r.from, "g"), r.to]);
        this.replacer.directory.push([new RegExp(r.from, "g"), r.to]);
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
      archive_name: param.archive_name_format || "%name%",
      archive_entry_name: param.entry_name_format || "%group%_%subgroup%"
    };

    console.log("replacer = ", this.replacer);
    console.log("format = ", this.format);

    let mode = param.mode;
    try{
      switch(mode){
        case "pack":
          var r = await this.action_generate_result(param);
          if(r.download_path){
            let res = this.scene.argument.response
            let fn = param.token + '.zip';
            console.log(this.scene.argument.server.config);
            let dp
              = this.scene.argument.server.config.path.expose.bucket
                + path.sep + fn;
            await fsp.rename( r.download_path, dp);
            return {
              download_path: "bucket?file=" + fn
            };
          }
          break;
        case "unpack":
          var r = await this.action_decompress_file(param);
          return {count: r.length};
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

    var result = {};
    /*==================================================
    */

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

    let nogroup_dd = path.dirname(this.path.content) + path.sep + '__nogroup';
    this.monolog("step", "before dirs");
    for(let entry_name of entry_list){
      let entry_path = base + path.sep + entry_name;
      let st = await fsp.stat(entry_path);

      if(st.isDirectory()){
        // Directory
        result  = await this.generate_converted_structure(result, entry_path);
      }else{
        // File
        console.log("@TODO!! for file handling");
        await fsx.mkdirp(nogroup_dd);
        await fsp.copyFile(entry_path, nogroup_dd + path.sep + entry_name);
        continue;
      }
    }

    try{
      let nogroup_files = await fsp.readdir(nogroup_dd);
      if(nogroup_files.length){
        result  = await this.generate_converted_structure(result, nogroup_dd);
      }
    }catch(e){
      //
    }

    let number = 0;
    for(let k in result){
      number++;
      let o = result[k];
      console.log("----------");
      console.log(o.name);
      for(let ofile of o.files){
        console.log("  =>", ofile.group + " " + ofile.hier.join(","));
      }

      let archive_name =
        this.format.archive_name
          .replace("%name%", o.name)
          .replace("%count%", o.files.length)
          .replace("%number%", number)
        ;

      await this.pack('zip', { zlib: { level: 9 } },
        this.path.result + path.sep + archive_name + '.zip',
        o.files.map((ov, i) => {
          let archive_entry_name =
            this.format.archive_entry_name
              .replace("%name%", o.name)
              .replace("%group%", ov.group)
              .replace("%subgroup%", ov.hier.join("-"))
              .replace("%number%", number)
              .replace("%index%", i)
            ;
          archive_entry_name = archive_entry_name.replace(/_$/, "");
          return [ov.path, archive_entry_name]
        })
      );
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
    if(!param.file.archive){
      throw new Error("Empty");
    }
    if(param.file.archive.type != "application/zip"){
      throw new Error("Only ZIP is supported. => " + param.file.archive.type);
    }
    let r = await this.unpack(param.file.archive, this.path.content);
    return {
      token: param.token,
      data: r
    };
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
          let ex = path.extname(f[0]);
          let op = { name: f[1] + ex };
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
    let trail = (new RegExp(path.sep + "$"));
    let zip_fnsp = file.name.split(".");
    let zip_fext = zip_fnsp.pop();
    let zip_fbsn = zip_fnsp.join(".");
    let zip_fbsn_reg = new RegExp("^" + zip_fbsn);
    return new Promise((res, rej) => {
      fs.createReadStream(zip_file_path)
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          try{
            let enc = EncodingJP.detect(entry.props.pathBuffer);
            let f = iconv.decode(entry.props.pathBuffer, enc);
            if(trail.test(f)){
              entry.autodrain();
            }else{
              let fnsp = f.split(".");
              let fext = fnsp.pop();
              let fbsn = fnsp.join(".");
              let p = dest_dir + path.sep + ((fbsn == zip_fbsn) ? f : f.replace(zip_fbsn_reg, ""));
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

  async generate_converted_structure(dict, entry_path, inherit_hier){

    let hier = inherit_hier ? inherit_hier.slice() : [];
    let entry_comp = entry_path.split(path.sep);
    let entry_name = entry_comp.pop();

    let gid = this.replace_entry('directory', entry_name);

    if(!gid){
      throw new Error("invalid content dir name");
    }

    let sub_entry_list = await fsp.readdir(entry_path);
    for(let sub_entry_name of sub_entry_list){
      let sub_entry_path = entry_path + path.sep + sub_entry_name;
      let st = await fsp.stat(sub_entry_path);

      // Recursion.
      if(st.isDirectory()){
        let hier_renamed = this.replace_entry('directory', sub_entry_name);
        dict = await this.generate_converted_structure(dict, sub_entry_path, hier.concat(hier_renamed));
        continue;
      }

      // renaming filename
      let id = this.replace_entry('file', sub_entry_name);
      let idsp = id.split(".");

      idsp.pop(); // Trims shitty ext.
      id = idsp.join(".");

      dict[id] = dict[id] || {
        name: id,
        files: []
      };
      dict[id].files.push({
        group: gid,
        hier: hier,
        path: sub_entry_path
      });
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
