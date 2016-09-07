
Gets a bit of info about a newly flashed node (MAC address, router model, chipset) and generates a sticker with node name and configuration URL.

# Setup

Ensure you have a modern stable node.js and install canvas dependencies:

```
sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++
```

(see the Installation section [here](https://github.com/chearon/node-canvas/tree/prefer-pango) for other operating systems)

Install node modules:

```
cd sticker-generator/
npm install
```

Copy settings file template (and edit to taste):

```
cp settings.js.example settings.js
```

# Running

Give your ethernet adapter the static IP `172.22.0.3`. Ensure you're plugged into a newly flashed node that has fully booted, then run:

```
./bin/cmd.js  
```

If you want to pretend that a node is connected use:

```
./bin/cmd.js --fake
```

If you want debug output and want to display the sticker instead of printing it then :

```
./bin/cmd.js --fake
```


# Notes

Note that [a fork of the node canvas module](https://github.com/chearon/node-canvas/tree/prefer-pango) is used which fixes serious custom font handling issues.

# Copyright and license

Copyright 2014, 2016 Marc Juul

License: AGPLv3