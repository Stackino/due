import * as webpack from 'webpack';
import * as path from 'path';

function configure(): webpack.Configuration {
    const configuration: webpack.Configuration = {
        entry: './src/index.ts',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'index.js',
            library: 'stackino_due_plugin_react',
            libraryTarget: 'umd'
        },
        module: {
            rules: [
				{ test: /\.tsx?$/, use: 'eslint-loader', exclude: /node_modules/, enforce: 'pre' },
				{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
            ],
        },
        resolve: {
			extensions: ['.tsx', '.ts', '.js'],
        },
        externals: {
            '@stackino/due': '@stackino/due',
            'core-decorators': 'core-decorators',
            'classnames': 'classnames',
            'mobx': 'mobx',
            'mobx-react-lite': 'mobx-react-lite',
            'react': 'react',
            'react-dom': 'react-dom',
            'tslib': 'tslib'
        },
    };

    return configuration;
}

module.exports = configure();