import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
    theme: {
        defaultTheme: 'nomariDark',
        themes: {
            nomariDark: {
                dark: true,
                colors: {
                    background: '#1A1D21',
                    surface: '#2D323C',
                    'surface-variant': '#363C48',
                    primary: '#D4867A',
                    'primary-darken-1': '#C4626A',
                    secondary: '#7B9BD4',
                    'secondary-darken-1': '#5C7CBA',
                    error: '#FC8181',
                    info: '#7B9BD4',
                    success: '#68D391',
                    warning: '#F6E05E',
                },
                variables: {
                    'border-color': '#404754',
                    'border-opacity': 1,
                    'high-emphasis-opacity': 0.87,
                    'medium-emphasis-opacity': 0.60,
                    'disabled-opacity': 0.38,
                },
            },
        },
    },
    defaults: {
        VBtn: {
            variant: 'flat',
            rounded: 'md',
        },
        VTextField: {
            variant: 'outlined',
            density: 'compact',
            rounded: 'md',
        },
        VSelect: {
            variant: 'outlined',
            density: 'compact',
            rounded: 'md',
        },
        VCard: {
            rounded: 'lg',
            elevation: 1,
        },
    },
})
