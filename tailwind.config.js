/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        ocean: '#0A192F',
        azure: '#0EA5E9',
        sunset: '#F59E0B',
        jungle: '#10B981',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        pacifico: ['Pacifico', 'cursive'],
        nunito: ['Nunito', 'sans-serif']
      }
    }
  },
  plugins: [],
}
