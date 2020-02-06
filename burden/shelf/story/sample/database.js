const Story = disc("class/Story");

module.exports = class extends Story {

  constructor(core){
    super(core);

    this.compose([
      "sqlite",
      //"mongodb"
    ]);
  }

  async chapter_sqlite(){
    var db = await this.core.database.connect("sqlite");

    await db.bucket.sample.create({
      label: "sample"
    });

    var r = await db.bucket.sample.findAll({});

    r.forEach(function(){
    });

    return r;
  }

  async chapter_mongodb(){
    var db = await this.core.database.connect("mongodb");

    var creating = new db.bucket.sample({
      label: "sample"
    });

    await creating.save();
    var q = db.bucket.sample.find({});
    var r = await q.exec();
    console.log(r);
    return r;
  }

}
