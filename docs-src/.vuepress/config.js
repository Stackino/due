module.exports = {
    title: 'Stackino Due',
    base: '/due/',
    description: 'Opinionated web application framework.',
    themeConfig: {
        nav: [
            { text: 'GitHub', link: 'https://github.com/stackino/due' },
        ],
        sidebar: [
            {
                title: 'Basics',
                collapsable: false,
                children: [
                    '/basics/installation',
                ],
            },
            {
                title: 'Getting started',
                collapsable: false,
                children: [
                    '/getting-started/1-minimal-application',
                    '/getting-started/2-pages',
                    '/getting-started/3-layouts',
                    '/getting-started/4-components',
                ],
            },
        ],
    },
};