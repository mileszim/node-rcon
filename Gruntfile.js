module.exports = function(grunt) {

  // Configuration.
  grunt.initConfig({
    babel: {
      options: {
        comments: false,
        presets: ['es2015']
      },
      dist: {
        files: {
          'dist/node-rcon.js': 'lib/node-rcon.js'
        }
      }
    }
  });

  // Load plugins
  grunt.loadNpmTasks('grunt-babel');

  // Tasks
  grunt.registerTask('default', 'build');
  grunt.registerTask('build', ['babel']);
};
