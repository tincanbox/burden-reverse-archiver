Vue.component('form-upload', {
  template: $('#template--form-upload').html(),
  props: ['stat'],
  created(){
    console.log(this.stat);
  },
  methods: {
    add_row(e){
      this.$props.stat.replacer.push({});
    }
  }
});

Vue.component('form-upload-file', {
  template: $('#template--form-upload-file').html(),
  props: ['stat'],
  methods: {
    update: (e) => {
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
  methods: {
  }
});

