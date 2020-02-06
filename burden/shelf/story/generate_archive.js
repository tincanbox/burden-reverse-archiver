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
  }

  /*
   */
  async chapter_main(transaction){

    let zip = transaction.request.file.upload;

    let cdir = this.core.config.path.app + path.sep + 'storage';
    let rdir = cdir + path.sep;

    let token = uuid();

    // Unzip uploaded file.
    let decomp_dir = rdir + path.sep + token + path.sep;
    await this.unpack(zip, decomp_dir);

    let regexp_target_dir = new RegExp("源泉徴収票");

    let dict = {};

    let repl_dir = [
      [/[^A-Za-z]+/g, ""]
    ];

    let repl_file = [
      ['080006', ""],
      ["ＰＥＲＳＯＮＡＬＡＧＥＮＴ", ""],
      [/[Ａ-Ｚａ-ｚ]/g, ""],
      ["株式会社_源泉徴収票等", ""],
      [/^PAHD-/, ""],
      [/^PAP-/, ""],
      [/^PAD-/, ""],
      [/^PAS-/, ""],
      [/^POOL-/, ""],
      [/(　| )/g, ""],
    ];

    /*==================================================
    */

    let dirs = await fsp.readdir(decomp_dir);
    // auto-dig dup cmp
    if(dirs.length == 1){
      dirs = await fsp.readdir(decomp_dir + path.sep + dirs[0]);
    }

    for(let dr of dirs){
      let sub_dir_path = decomp_dir + path.sep + dr;
      let st = await fsp.stat(sub_dir_path);

      if(!dr.match(regexp_target_dir)){
        continue;
      }

      if(st.isDirectory()){
      }else{
        continue;
      }

      let gid = dr;
      for(let replace_config of repl_dir){
        gid = gid.replace(replace_config[0], replace_config[1]);
      }

      console.log("========================================");
      console.log(gid);

      let files = await fsp.readdir(sub_dir_path);

      for(let f of files){
        let sub_dir_file_path = sub_dir_path + path.sep + f;
        let id = f;
        let st = await fsp.stat(sub_dir_file_path);
        if(st.isDirectory()){
          console.log("skipping", f);
          continue;
        }
        for(let replace_config of repl_file){
          id = id.replace(replace_config[0], replace_config[1]);
        }
        id = id.replace(/\.pdf$/, "")
        dict[id] = dict[id] || {
          name: id,
          files: []
        };
        dict[id].files.push({
          group: gid,
          path: sub_dir_file_path
        });
      }
    }

    for(let k in dict){
      let o = dict[k];
      await this.pack('zip', { zlib: { level: 9 } },
        decomp_dir + "result" + path.sep + o.name + '.zip',
        o.files.map((ov) => {
          return [ov.path, ov.group]
        })
      );
    }

    return {
      token: token,
      data: dict
    };
  }

  /*
   */
  async unpack(file, dest_dir){
    let files = [];
    let zip_file_path = file.path;
    let trail = (new RegExp(path.sep + "$"));
    let fnsp = file.name.split(".");
    let bs = new RegExp("^" + ((fnsp.length > 1 ? fnsp.slice(0, -1) : fnsp).join(".")));
    return new Promise((res, rej) => {
      fs.createReadStream(zip_file_path)
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          try{
            let f = iconv.decode(entry.props.pathBuffer, 'sjis');
            if(trail.test(f)){
              entry.autodrain();
            }else{
              let p = dest_dir + path.sep + f.replace(bs, "");
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
        .catch(rej)
      ;
    })
  }

  /*
   */
  async pack(type, opt, dest_archive, files, callback){
    // create a file to stream archive data to.
    await fsx.mkdirp(path.dirname(dest_archive));
    var output = fs.createWriteStream(dest_archive);
    var archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function() {
      //console.log(dest_archive, archive.pointer() + ' total bytes');
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function() {
      //
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
      if(err.code === 'ENOENT'){
      }else{
        // throw error
        throw err;
      }
    });

    // good practice to catch this error explicitly
    archive.on('error', function(err) {
      throw err;
    });

    // pipe archive data to the file
    archive.pipe(output);

    // append a file from stream
    for(let f of files){
      let ex = path.extname(f[0]);
      archive.append(fs.createReadStream(f[0]), { name: f[1] + ex });
    }

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    archive.finalize();

    return files;
  }

}
