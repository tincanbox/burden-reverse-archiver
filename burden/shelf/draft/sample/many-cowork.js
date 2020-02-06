module.exports = [
  [...Array(5).keys()].map((v) => {
    return {
      story: 'sample/many-cowork',
      space: {
        isolated: false
      },
      premise: {
        value: v
      }
    }
  })
];
