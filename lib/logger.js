
module.exports = function LoggerFactory( chalk, logDebug ) {
 
    function log( message ) {

        // Rewire the first argument to be colorful.
        arguments[ 0 ] = chalk.green( arguments[0] );
 
        console.log.apply( console, arguments );

    }

    // I log the debugging message to the console. The message supports %s style
    // interpolation as it is being handed off to the console.log().
    function debug( message ) {
 
        // Rewire the first argument to be colorful.
        arguments[ 0 ] = chalk.yellow( arguments[0] );
 
        if(logDebug)
            console.log.apply( console, arguments );
 
    }

    function error( message ) {
 
        // Rewire the first argument to be colorful.
        arguments[ 0 ] = chalk.red( arguments[0] );
 
        console.log.apply( console, arguments );

    }


    // Return the public API.
    return {
        log: log,
        debug: debug,
        error: error
    };
 
};
