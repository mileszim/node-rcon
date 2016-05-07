/*!
 * node-rcon - examples/stdio.js
 * Copyright(c) 2012 Justin Li <j-li.net>
 * MIT Licensed
 */

/*
 * This example reads commands from stdin and sends them on enter key press
 * You need to manually `npm install keypress` for this example to work
 */

import keypress from 'keypress';
import Rcon from 'node-rcon';

let conn = new Rcon('localhost', 1234, 'password');

conn.on('auth',     ()    => { console.log("Authed!"); })
    .on('response', (str) => { console.log("Got response: " + str); })
    .on('end',      ()    => { console.log("Socket closed!"); process.exit(); });

conn.connect();


keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

let buffer = "";

process.stdin.on('keypress', (chunk, key) => {
  if (key && key.ctrl && (key.name == 'c' || key.name == 'd')) {
    conn.disconnect();
    return;
  }

  process.stdout.write(chunk);
  
  if (key && (key.name == 'enter' || key.name == 'return')) {
    conn.send(buffer);
    buffer = "";
    process.stdout.write("\n");
  } else if (key && key.name == 'backspace') {
    buffer = buffer.slice(0, -1);
    process.stdout.write("\033[K"); // Clear to end of line
  } else {
    buffer += chunk;
  }
});
