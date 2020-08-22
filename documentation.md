# SimpleMVC.js Documentation
This documentation is for a pre-release version of SimpleMVC.js

## SimpleMVC.App
The App class is the foundation of SimpleMVC. It encapsulates the http server, controller routing, sessions, static files, and database initialization.

### App.addControllers(...controllers: SimpleMVCController[])
Adds the individual controller routes to the http server. 

**NOTE: If the same route is defined in multiple actions only the first one is executed.**

### App.listen(host: string?, port: int?)
Creates an http server that listens on http://{host}:{port}.

**NOTE: If host or port parameters are null, the HOST or PORT environment variable will be used.**

### App.initDbConnection()
Initializes the MongoDB database connection, using the MONGO_* environment variables.

### App.initSessions()
Intializes the Session middleware.

**NOTE: If the database connection has been previously intialised, session state will be stored in the collection `simple_sessions`, otherwise it will be stored only in memory.**

### App.initStaticFiles(path: string)
Adds a file route for http://{host}:{port}/* to be run after no other routes are found. This route will then look for files to be delivered stored at the relative path provided by the `path` parameter.

**NOTE: This should be called only AFTER all controllers have been added.**