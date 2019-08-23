module.exports = {
    title: 'Stackino Due',
    base: '/due/',
    description: 'Opinionated web application framework.',
    themeConfig: {
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
                    '/getting-started/2-adding-pages',
                ],
            },
        ],
    },
};