const Story = disc("class/Story");

module.exports = class extends Story {

  constructor(core){
    super(core);

    this.preface([
    ]);

    this.premise([
    ]);

    this.compose([
      "retrieve"
    ]);

  }


  /* play your way with sample chapter.
   */
  async chapter_retrieve(transaction){

    if(!transaction.request){
      throw new Error("Invalid Request");
    }

    var fls = {};
    for(var f in transaction.request.file){
      var file = transaction.request.file[f];
      fls[f] = fls[f] || {};
      ['name', 'type', 'size'].forEach((k) => {
        fls[f][k] = file[k];
      });
    }

    return fls;
  }

}
