const Story = disc("class/Story");

module.exports = class extends Story {

  constructor(core){
    super(core);

    this.preface([
    ]);

    this.premise([
    ]);

    this.compose([
      "sample",
      "output"
    ]);

  }


  /* play your way with sample chapter.
   */
  async chapter_sample(param, prev){

    await this.pull('https://news.yahoo.com/');

    /* Waits and finds target elements.
     */
    await FM.async.poll(async (rs) => {
      var l = await this.page.evaluate(() => {
        return $P('.js-stream-content').length > 0;
      });
      if(l) rs(true);
    });

    /* DOM manipulations via $P.
     */
    var headlines = await this.page.evaluate(() => {
      var titles = [];
      $P('.js-stream-content').each((i, el) => {
        var wrap = $P(el);
        titles.push(wrap.find('h3').text());
      });
      return titles;
    });

    return headlines;
  }

  async chapter_output(param, prev){
    for(var r of prev){
      // Shows One by One logs.
      this.monolog('yahoo-news-headline', r);
    }
    return prev;
  }

}
