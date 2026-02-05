/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                silver: {
                    50: '#F9F9FB',
                    100: '#F2F2F7',
                    200: '#E5E5EA',
                    300: '#D1D1D6',
                    400: '#C7C7CC',
                    500: '#AEAEB2',
                    600: '#8E8E93',
                    700: '#636366',
                    800: '#48484A',
                    900: '#3A3A3C',
                    950: '#1C1C1E',
                },
                brand: {
                    primary: '#000000',
                    secondary: '#636366',
                    accent: '#8E8E93',
                }
            },
            borderRadius: {
                'xl': '20px',
                '2xl': '24px',
                '3xl': '32px',
            }
        },
    },
    plugins: [],
};
