#!/usr/bin/env node

var fs = require('fs');
var exec = require('child_process').exec;

var ssh2 = require('ssh2');
var tmp = require('tmp');

var argv = require('minimist')(process.argv.slice(2));
var humanMAC = require('sudomesh-human-mac');

var StickerGenerator = require('../sticker_gen.js');
var settings = require('../settings.js');

function debug(str) {
    if(argv.debug) {
        process.stdout.write('[DEBUG] ');
        console.log(str);
    }
}

function remoteCommand(conn, cmd, callback) {
    debug("Running remote command: " + cmd);
    conn.exec(cmd, function(err, stream) {
        if(err) {
            return callback("Error running remote command: " + err);
        }
        var allStdout = '';
        var allStderr = '';
        stream
            .on('data', function(stdout) {
                allStdout += stdout;
            })
            .stderr.on('data', function(stderr) {
                allStderr += stderr;
            })
            .on('end', function() {
                callback(null, allStdout, allStderr);
            });
    });
};

var parseModel = function(cpuInfo) {
    var m;

    m = cpuInfo.match(/^machine\s*:\s+(.*)$/im);
    if(m && m.length > 1) {
        return m[1];
    }
    return null;
}

var parseChipset = function(cpuInfo) {
    var m;

    m = cpuInfo.match(/^system type\s*:\s+(.*)$/im);
    if(m && m.length > 1) {
        return m[1];
    }
    return null;
}


function getNodeInfo(opts, cb) {
    if(typeof opts === 'function') {
        cb = opts;
        opts = {};
    }

    opts = opts || {};

    if(opts.fake) {
        process.nextTick(function() {
            cb(null, {
                mac: '8c:70:af:b1:c3:62',
                chipset: 'Atheros AR9344 rev 2',
                model: 'TP-LINK TL-WDR3500'
            });
        });
        return;
    }

    var conn = new ssh2();

    console.log("Connecting to " + settings.node_ip + " port " + settings.node_port);
    
    conn
        .on('error', function(err) {
            console.error(err);
        })
        .on('ready', function() {

            var nodeInfo = {};

            var cmd = "cat /proc/cpuinfo";
            debug("Running remote command: " + cmd);

            remoteCommand(conn, cmd, function(err, stdout, stderr) {
                if(err) {
                    conn.end();
                    return cb(err + "\n" + stderr);
                }

                nodeInfo.chipset = parseChipset(stdout);
                nodeInfo.model = parseModel(stdout);

                var cmd = "cat /sys/class/net/eth0/address";
                debug("Running remote command: " + cmd);

                remoteCommand(conn, cmd, function(err, stdout, stderr) {

                    if(err) {
                        conn.end();
                        return cb(err + "\n" + stderr);
                    }
                    
                    nodeInfo.mac = parseMAC(stdout);
                    conn.end();
                    cb(null, nodeInfo);
                });
            });
            
        })
        .connect({
            host: settings.node_ip,
            port: settings.node_port,
            username: settings.node_user,
            password: settings.node_password
        });
    
}


function generateSticker(nodeInfo, cb) {

    var humac = humanMAC.humanize(nodeInfo.mac);

    var sticker = new StickerGenerator({
        padding: {
            top: 0,
            bottom: 5
        },
        font: {
            size: 50,
            lineSpacing: 22
        }
    });

    sticker.writeLine("The name of your node is:", 'normal', 40);
    sticker.writeLine(' ');
    sticker.writeLine('    ' + humac, 'bold');
    sticker.writeLine(' ');
    sticker.writeLine("For first-time configuration go to:", 'normal', 40);
    sticker.writeLine(' ');
    sticker.writeLine("    https://begin.peoplesopen.net/", 'bold', 50);
    sticker.writeLine(' ', 'normal', 20, 40);
    sticker.writeLine("Router model: " + nodeInfo.model, 'normal', 30);

    var fileName = tmp.tmpNameSync();
    sticker.saveImage(fileName, function(err) {
        if(err) return cb(err);
        debug("Wrote sticker image to " + fileName);
        cb(null, fileName);
    });
    
}

function printSticker(stickerFilePath, cb) {

    if(argv.debug) {
        debug("Displaying " + stickerFilePath);
        exec(settings.print_cmd_debug + ' ' + stickerFilePath, cb);
    } else {
        console.log("Printing sticker...");
        exec(settings.print_cmd + ' ' + stickerFilePath, cb);
    }
}


getNodeInfo({fake: true}, function(err, nodeInfo) {
    if(err) {
        console.error("Error:", err);
        process.exit(1);
    }

    generateSticker(nodeInfo, function(err, stickerFilePath) { 
        if(err) {
            console.error("Error:", err);
            process.exit(1);
        }

        printSticker(stickerFilePath, function(err) {
            if(err) {
                console.error("Error:", err);
                process.exit(1);
            }
            
            console.log("Sticker printed successfully!");

            fs.unlink(stickerFilePath, function(err) {
                if(err) {
                    console.error("Error:", err);
                    process.exit(1);
                }
                debug("Deleted temporary sticker file from " + stickerFilePath);
            });
        });
    });
}); 
