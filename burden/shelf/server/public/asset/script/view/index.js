(() => {

  new Vue({
    el: '#main',
    data(){
      return {
        form: this,
        replacer: [],
        decomped: null,
        est: null
      }
    },
    methods: {
      async fetch_dest_info(){
        let p = retrieve_form_data();
        console.log("p", p);
        let r = await APP.request_gently('post', '/run/generate_archive', Object.assign({
          token: ACCESS_TOKEN,
          mode: 'estimate_result'
        }, p));
        this.est = r.est;
      },
      async upload(){
        try{
          let r = await request_unpack();
          this.decomped = r;
          console.log("r", r);
          await this.fetch_dest_info();
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'アップロードが完了しました。設定を完了してダウンロードしてください。',
          });
        }catch(e){
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: "Error: " + e.message
          });
        }
      },
      async download(){
        try{
          let r = await retrieve_packed_zip();
          if(r.download_path){
            window.open(
              window.location.protocol + "//"
              + window.location.host + "/" + r.download_path);
          }
        }catch(e){
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: "Error: " + e.message
          });
        }
      }
    }
  });

  function request_unpack(){
    let uploading = $('#upload')[0].files[0];

    if(!uploading){
      throw new Error("ファイルを選択してください。");
    }

    let p = retrieve_form_data();

    return APP.request_gently('post', '/run/generate_archive', Object.assign({
      token: ACCESS_TOKEN,
      mode: 'unpack',
      archive: uploading
    }, p));
  }

  function retrieve_packed_zip(){
    let p = retrieve_form_data();
    return APP.request_gently('post', '/run/generate_archive', Object.assign({
      token: ACCESS_TOKEN,
      mode: 'pack',
    }, p));
  }

  function retrieve_form_data(){
    let p = {};
    p.group_name_format = $('[name="group_name_format"]').val() || "";
    p.entry_name_format = $('[name="entry_name_format"]').val() || "";
    p.toggle_archive_each_content
      = $('[name="toggle_archive_each_content"]').attr("checked") || "";
    p.replacer = ((() => {
      let ret = [];
      let from = $('[name^=replacer-from]');
      let to = $('[name^=replacer-to]');
      from.each((i) => {
        ret.push({
          from: from.eq(i).val(),
          to: to.eq(i).val()
        });
      });
      return ret;
    })());

    return p;
  }

})();
