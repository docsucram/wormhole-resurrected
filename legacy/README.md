Wormhole Redux
==============

A revitalization effort of the classic Wormhole game.

## Background

Wormhole was a fast paced multiplayer arcade game of survival. Players would pilot ships in a race to collect powerups and fire them into enemy wormholes. The last man (or team) standing wins.

Wormhole originally released in the early 2000s by Centerfleet (later Centerscore). The game also showed up on Newgrounds after becoming popular. Sadly, [on December 31 2002, the game and website were shutdown](http://web.archive.org/web/20021209120222/http://centerfleet.com:80/index.html).

Several years ago, the client code was released on the internet. This project looks to revive classic wormhole based on that client code, including fixing any issues present in the client and piecing together a server from scratch by analyzing the client and the communication that the client expects.

## Building and Running
For development, Eclipse seems to work well. Originally, Wormhole was a Java applet and Eclipse is capable of easily running Java applets. Aside from Eclipse, Java JDK still contains capabilities for running applets with the `appletviewer` executable that you can find in 
bin folder of the JDK installation directory.

Now that the client is no longer an applet, it can be run as a normal Java program. For example to build the client, in terminal/command prompt you can do:

```
$ javac client/*.java
```

To build the server:

```
$ javac server/*.java`
```

To start the client you can then do:

```
$ java client.GameLoader
```

To start the server you can do:

```
$ java server.Server
```

**Note that the client is hardcoded to connect to a specific IP address (server).** This is located in the property file in `client/prop.txt` as the `hostname` parameter. For development purposes, it is probably easiest to modify `client/network` and substitute your test server host into the line with:
``` java
(this.m_socket = new Socket(host, port)).setSoTimeout(10000);
```

For example, if you are running a test server on your local machine, you may want to use:
``` java
(this.m_socket = new Socket("127.0.0.1", port)).setSoTimeout(10000);
```

Of course, if you are wanting others to connect to your server, you will probably have to open whatever port the socket server is listening on. Currently, the port is set in `client/prop.txt` and `server/Server.java`.

## Future Direction

In my opinion, the most important things to work on next would be:

1. Port the game back into a browser and modernize interface.
2. Implement a system for permanent accounts.
3. Implement a ranking system.

The game was originally in the browser because it was an applet, but applets are no longer supported. Porting it back in the browser would probably make (2) easier as well, because it would enable using existing OAuth services. 

## Sample Gameplay

![wormhole_gameplay.gif](wormhole_gameplay.gif)