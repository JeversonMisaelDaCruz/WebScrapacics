// obtain cookieconsent plugin
var cc = initCookieConsent();

// run plugin with config object
cc.run({
    current_lang: 'en',
    autoclear_cookies: true,                    // default: false
    cookie_name: 'cc_cookie_demo2',             // default: 'cc_cookie'
    cookie_expiration: 365,                     // default: 182
    page_scripts: true,                         // default: false
    force_consent: true,                        // default: false

    // auto_language: null,                     // default: null; could also be 'browser' or 'document'
    autorun: true,                              // default: true
    // delay: 0,                                // default: 0
    // hide_from_bots: false,                   // default: false
    // remove_cookie_tables: false              // default: false
    // cookie_domain: location.hostname,        // default: current domain
    // cookie_path: '/',                        // default: root
    // cookie_same_site: 'Lax',
    // use_rfc_cookie: false,                   // default: false
    // revision: 0,                             // default: 0

    gui_options: {
        consent_modal: {
            layout: 'cloud',                    // box,cloud,bar
            position: 'bottom center',          // bottom,middle,top + left,right,center
            transition: 'slide'                 // zoom,slide
        },
        settings_modal: {
            layout: 'bar',                      // box,bar
            position: 'left',                   // right,left (available only if bar layout selected)
            transition: 'slide'                 // zoom,slide
        }
    },

    onFirstAction: function(){
        console.log('onFirstAction fired');
    },

    onAccept: function (cookie) {
        console.log('onAccept fired!')
    },

    onChange: function (cookie, changed_preferences) {
        console.log('onChange fired!');
        console.log(changed_preferences);

        // If analytics category is disabled => disable google analytics
        if (!cc.allowedCategory('analytics')) {
            typeof gtag === 'function' && gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
        }
    },

    languages: {
        'en': {
            consent_modal: {
                title: 'Este site utiliza cookies!',
                description: 'Nosso site utiliza cookies para melhorar a experiência do usuário. Você pode permitir, rejeitar e gerenciar os cookies. Para mais informações, consulte a nossa  <a href="https://acicvel.com.br/cookies" target="_blank">Política de Cookies</a>.',
                primary_btn: {
                    text: 'Permitir Todos',
                    role: 'accept_all'      //'accept_selected' or 'accept_all'
                },
                secondary_btn: {
                    text: 'Personalizar ou Rejeitar',
                    role: 'settings'       //'settings' or 'accept_necessary'
                },
                revision_message: '<br><br> Dear user, terms and conditions have changed since the last time you visisted!'
            },
            settings_modal: {
                title: 'Configuração de Cookies',
                save_settings_btn: 'Salvar atual seleção',
                accept_all_btn: 'Permitir',
                reject_all_btn: 'Rejeitar',
                close_btn_label: 'Fechar',
                cookie_table_headers: [
                    {col1: 'Nome'},
                    {col2: 'Domínio'},
                    {col3: 'Expiração'},
                    {col4: 'Descrição'}
                ],
                blocks: [
                    {
                        title: '',
                        description: '',
                    }, {
                        title: 'Cookies estritamente necessários',
                        description: '',
                        toggle: {
                            value: 'necessary',
                            enabled: true,
                            readonly: true  //cookie categories with readonly=true are all treated as "necessary cookies"
                        }
                    }, {
                        title: 'Cookies analíticos e de desempenho',
                        description: '',
                        toggle: {
                            value: 'analytics',
                            enabled: false,
                            readonly: false
                        },
                        cookie_table: [
                            {
                                col1: '_ga',
                                col2: 'acicvel.com.br',
                                col3: "2 anos",
                                col4: "The _ga cookie, installed by Google Analytics, calculates visitor, session and campaign data and also keeps track of site usage for the site's analytics report. The cookie stores information anonymously and assigns a randomly generated number to recognize unique visitors."
                            },
                            {
                                col1: '_gcl_au',
                                col2: 'acicvel.com.br',
                                col3: "3 meses",
                                col4: "Provided by Google Tag Manager to experiment advertisement efficiency of websites using their services."
                            },
                            {
                                col1: '_gid',
                                col2: 'acicvel.com.br',
                                col3: "1 dia",
                                col4: "Installed by Google Analytics, _gid cookie stores information on how visitors use a website, while also creating an analytics report of the website's performance. Some of the data that are collected include the number of visitors, their source, and the pages they visit anonymously."
                            },
                            {
                                col1: '_gat_UA-152052371-1',
                                col2: 'acicvel.com.br',
                                col3: '1 minuto',
                                col4: "	A variation of the _gat cookie set by Google Analytics and Google Tag Manager to allow website owners to track visitor behaviour and measure site performance. The pattern element in the name contains the unique identity number of the account or website it relates to."
                            },
                            {
                                col1: '_ga_NBJRQBTYDF',
                                col2: 'acicvel.com.br',
                                col3: '2 anos.',
                                col4: "This cookie is installed by Google Analytics."
                            },
                            {
                                col1: 'rdtrk',
                                col2: 'acicvel.com.br',
                                col3: '1 ano',
                                col4: "Used by RD Station to keep a list of all pages a visitor accessed within the domain even before conversion."
                            },
                            {
                                col1: '_rdtrk',
                                col2: 'rdstation.com.br',
                                col3: '9 anos',
                                col4: "Used by RD Station to keep a list of all pages a visitor accessed within the domain even before conversion."
                            },
                            {
                                col1: '__trf.src',
                                col2: 'acicvel.com.br',
                                col3: '1 ano',
                                col4: "Save the reference to the origin of the user's visit to the website."
                            }
                        ]
                    }, {
                        title: 'Cookies de segmentação e publicidade',
                        description: '',
                        toggle: {
                            value: 'targeting',
                            enabled: false,
                            readonly: false,
                            reload: 'on_disable'            // New option in v2.4, check readme.md
                        },
                        cookie_table: [
                            {
                                col1: 'IDE',
                                col2: 'doubleclick.net',
                                col3: '1 ano',
                                col4: "	Google DoubleClick IDE cookies are used to store information about how the user uses the website to present them with relevant ads and according to the user profile."
                            },
                            {
                                col1: '_fbp',               // New option in v2.4: regex (microsoft clarity cookies)
                                col2: 'acicvel.com.br',
                                col3: "3 meses",
                                col4: "	This cookie is set by Facebook to display advertisements when either on Facebook or on a digital platform powered by Facebook advertising, after visiting the website."
                            },
                            {
                                col1: 'test_cookie',
                                col2: 'doubleclick.net',
                                col3: "15 minutos",
                                col4: "The test_cookie is set by doubleclick.net and is used to determine if the user's browser supports cookies."
                            }
                        ]
                    }, {
                        title: '',
                        description: '',
                    }
                ]
            }
        }
    }
});