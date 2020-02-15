Vue.component('form-main', {
  template: $('#template--form-main').html(),
  props: ['stat'],
  created(){
    this.monitor = FM.time.monitor(1000);
  },
  methods: {
    update(e){
      console.log("form-upload: update", e)
      this.$emit('update');
    },
    add_row(e){
      this.$props.stat.replacer.push({});
    },
    watch_update(e){
      var el = $(e.target);
      this.monitor(el.val(), (p) => {
        (p === el.val()) && this.$emit('update');
      })
    },

  }
});

Vue.component('form-upload-file', {
  template: $('#template--form-upload-file').html(),
  props: ['stat'],
  methods: {
    update_label: (e) => {
      let el = $(e.target);
      let label = el.val().replace(new RegExp("\\\\", "g"), '/').replace(/.*\//, '');
      if(label){
        el.siblings('.custom-file-label').text(label);
      }else{
        el.siblings('.custom-file-label').text("Select File");
      }
    }
  }
});

Vue.component('form-upload-replacer', {
  template: $('#template--form-upload-replacer').html(),
  props: ['stat'],
  created(){
    this.monitor = FM.time.monitor(1000);
  },
  methods: {
    watch_update(e){
      var el = $(e.target);
      this.monitor(el.val(), (p) => {
        (p === el.val()) && this.$emit('update');
      })
    },
  }
});

