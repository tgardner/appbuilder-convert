
module.exports = function LoggerFactory( chalk, logDebug ) {
 
    function log( message ) {

        var args = arguments;

        // Rewire the first argument to be colorful.
        args[ 0 ] = chalk.green( args[0] );
 
        console.log.apply( console, args );

    }

    // I log the debugging message to the console. The message supports %s style
    // interpolation as it is being handed off to the console.log().
    function debug( message ) {
        
        var args = arguments;

        // Rewire the first argument to be colorful.
        args[ 0 ] = chalk.yellow( args[0] );
 
        if(logDebug)
            console.log.apply( console, args );
 
    }

    function error( message ) {
 
        var args = arguments;
        
        // Rewire the first argument to be colorful.
        args[ 0 ] = chalk.red( args[0] );
 
        console.log.apply( console, args );

    }


    // Return the public API.
    return {
        log: log,
        debug: debug,
        error: error
    };
 
};
