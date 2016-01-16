require.config({
    baseUrl: 'js/',
    paths: {
        'requireLib': 'libs/require.min',
        'angular': 'libs/angular.min',
        'css-format': 'libs/css-format.min',
        'rawUI': 'libs/raw-ui.min'
    },
    shim: {
        'main' : {
            deps: ['requireLib', 'angular'],
            exports: 'require'
        },
        'angular': {
            exports: 'angular'
        }
    }
});

require([
        'app',
        'directives'
    ], function (app) {
        angular.bootstrap(document.body, ['app']);
});