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
        console.log("Form Param = ", p);
        let r;
        try{
          r = await APP.request_gently('post', '/run/generate_archive', Object.assign({
            token: ACCESS_TOKEN,
            mode: 'estimate_result'
          }, p));
          this.est = r.est;
        }catch(e){
          if(e.message.match("invalid content dir name")){
            Swal.fire({
              icon: 'error', title: '設定エラー',
              text: "置換後に空となってしまうディレクトリがあります。置換設定を確認してください。 => " + e.message });
          }else{
            Swal.fire({
              icon: 'error', title: '設定エラー',
              text: e.message });
          }
        }
      },
      async preview(){
        try{
          var vm = this;
          show_preview_table(vm);
        }catch(e){
          dialog_error(e);
        }
      },
      async upload(){
        try{
          let r = await request_unpack();
          this.decomped = r;
          console.log("request unpacked =", r);
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
    p.file_encoding = $('[name="file_encoding"]').val() || "";
    p.entry_name_hier_glue_char = $('[name="entry_name_hier_glue_char"]').val() || "";
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

  function show_preview_table(vm){
    return Swal.fire({
      customClass: 'swal-auto',
      icon: null,
      html: ''
      + '<div id="preview">'
      + '<div class="form-group">'
      + '<div class="input-group">'
      + '<select id="preview-filter-col" v-on:change="filter" class="custom-select form-control col-md-2"></select>'
      + '<input id="preview-filter-val" class="form-control col-md-10" v-on:change="filter">'
      + '</div>'
      + '</div>'
      + '<div class="tabulator"><div class="tabulator-footer"><div id="preview-table-paginator"></div></div></div>'
      + '<div id="preview-table" style="min-height: 400px; height: 60vh;">'
      + '</div>'
      + '</div>',
      onOpen: () => {
        new Vue({
          el: '#preview',
          data(){
            return {
              est: this.est
            };
          },
          methods: {
            async filter(){
              var fil_col = $('#preview-filter-col').val();
              var fil_val = $('#preview-filter-val').val();
              if(fil_col && fil_val){
                vm.tabulator.setFilter(fil_col, "like", fil_val);
              }else{
                vm.tabulator.clearFilter();
              }
            },
          }
        });

        var fds = ['format', 'orig'];
        for(var f of fds){
          var ht = '<option value="' + f + '">' + f + '</option>';
          var dm = $(ht);
          if(f == 'label') dm.attr("selected", "selected");
          $("#preview-filter-col").append(dm);
        }

        vm.tabulator = new Tabulator('#preview-table', {
          data: vm.est,
          layout:"fitColumns",
          responsiveLayout:"hide",
          tooltips: true,
          addRowPos:"top",          //when adding a new row, add it to the top of the table
          history:true,             //allow undo and redo actions on the table
          paginationElement: document.getElementById("preview-table-paginator"),
          pagination: "local",
          paginationSize: 10,
          movableColumns:true,      //allow column order to be changed
          resizableRows:true,       //allow row order to be changed
          initialSort:[             //set the initial sort order of the data
            //{column:"name", dir:"asc"},
          ],
          columns:[                 //define the table columns
            {title:"Format", field:"format", formatter: "textarea"},
            {title:"Original", field:"orig", formatter: "textarea"},
            {title:"Files", field:"files", formatter: (cell) => {
              var row = cell.getRow();
              var data = row.getData();
              var html = "";
              for(var f of data.files){
                html += ''
                  + '<div v-for="f of row.files">'
                  + '<small><small><i class="fas fa-file"></i></small>&nbsp;'
                  + f.format + f.ext + '</small></div>';
              }

              return html;
            }},
          ],
        });

      }
    });
  }


})();
