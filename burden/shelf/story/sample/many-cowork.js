const Story = disc("class/Story");

module.exports = class extends Story {

  constructor(core){
    super(core);

    this.preface([
    ]);

    this.premise([
    ]);

    this.compose([
      "sample"
    ]);

  }


  /* play your way with sample chapter.
   */
  async chapter_sample(param, prev){

    await this.scene.commence();
    await FM.async.sleep(1000);

    let kuroko = await this.core.backroom.pop();

    await kuroko.run((port, data) => {
      data.some = data.some + 1;
      return data;
    }, { some: 1 }).then((r) => {
      console.log("worker result", r);
    });

    let b = await this.page.evaluate(() => {
      return new Date().toLocaleString();
    });

    console.log(b);

  }

}
