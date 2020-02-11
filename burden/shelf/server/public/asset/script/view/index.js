(() => {

  new Vue({
    el: '#main',
    data(){
      return {
        form: this,
        sample: "hoge",
        replacer: [],
        decomped: null
      }
    },
    methods: {
      async upload(){
        try{
          let r = await request_unpack();
          this.decomped = r;
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
          if(r.data.download_path){
            window.open(window.location.protocol + "//" + window.location.host + "/" + r.data.download_path);
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

    let f = new FormData();
    f.append('archive', uploading);
    f.append('mode', 'unpack');
    f.append('token', ACCESS_TOKEN);

    return new Promise((res, rej) => {
      $.ajax({
        type: "post",
        url: "/run/generate_archive",
        data: f,
        processData: false,
        contentType: false,
        complete: (r) => {
          var result = r.responseJSON || false;
          if(!result || result.error){
            rej(new Error(result.error.detail));
          }else{
            res(result.data);
          }
        },
        error: (r) => {
          rej(r);
        }
      })
    });
  }

  function retrieve_packed_zip(){
    let rp = {
      token: ACCESS_TOKEN,
      mode: 'pack',
      archive_name_format: $('[name="archive_name_format"]').val(),
      entry_name_format: $('[name="entry_name_format"]').val(),
      archive_each_content: $('[name="archive_each_content"]').val(),
      replacer: (() => {
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
      })()
    };
    return new Promise((res, rej) => {
      $.ajax({
        type: "post",
        url: "/run/generate_archive",
        data: rp,
        complete: (r) => {
          var result = r.responseJSON || false;
          if(!result || result.error){
            rej(new Error(result.error.detail));
          }else{
            res(result);
          }
        },
        error: (r) => {
          rej(r);
        }
      });
    });
  }

})();
