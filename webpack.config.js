const path = require('path');

module.exports = {
  entry: {
    'firebase-analytics': path.resolve(__dirname, 'src/firebase-analytics.js'),
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'js'),
    clean: false,
  },
};
