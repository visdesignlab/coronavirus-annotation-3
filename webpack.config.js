const path = require('path');
const autoprefixer = require('autoprefixer');

module.exports = {
  entry: ['./theme/scss/index.scss', './theme/js/index.js'],
  //entry: {index: './theme/js/index.js', annotation: './theme/js/annotation.js'},
  output: {
    path: path.resolve(__dirname, './app/static/'),
    filename: 'bundle.js',
     // your stuff
    publicPath: path.resolve(__dirname, './app/static/assets/')
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              path: path.resolve(__dirname, './app/static/'),
              name: 'bundle.css',
            },
          },
          {loader: 'extract-loader'},
          {loader: 'css-loader'},
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [autoprefixer()]
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                includePaths: ['./node_modules'],
              }
            },
          }
        ],
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['@babel/preset-env'],
        },
      }
    ],
  },
};
