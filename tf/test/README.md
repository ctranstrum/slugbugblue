# Testing

We use node modules to test our code. Environment-specific variables are kept in a tiny javascript module named "secrets" to keep them out of revision control. To enable the tests in your environment, you will need to create your own secrets.js file and populate it with the correct information. Use this as a template:

    'require strict';

    exports.hostname = 'mydomain.com';
