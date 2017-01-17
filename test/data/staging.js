module.exports = {
  name: 'staging tier',
  prop: 3,
  stagingprop: true,
  section: {
    nested: {
      val: 'staging'
    }
  },
  nested: {
    empty: {
        something: 1
    },
    nonarray: 1,
    array: [ 3 ]
  },
  nonarray: 1,
  array: [ 3 ]
};
