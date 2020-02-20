Vue.component('component-preview', {
  template: $('#template--component-preview-content').html(),
  props: ['est'],
  data(){
    let limit = 10;
    let rcd = this.est.length;
    let pgs = Math.floor(rcd / limit);
    return {
      page: 1,
      per_page: limit,
      pages: pgs >= 1 ? (rcd > (limit * pgs) ? (pgs + 1) : pgs) : 1
    }
  },
  created(){
  },
  methods: {
  }
});
