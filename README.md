# minimal-viewer

Instructions :
1. Clone this repo
2. Launch a basic web server from the root folder. (e.g. by running http-server from the command prompt. see https://www.npmjs.com/package/http-server)
3. Point your browser to the address that the webserver is serving on.
4. Use a private or incognito browser window to avoid any unexpected behavior caused by the browser's cache.

This is a minomal sample application built using vanilla JavaScript, HTML, and WebComponents. It is a simple, framework agnostic sample that shows how to load and render various file formats, while providing a simple tree view to explore the model structure.

# Running the demo

simply run an http-server in the same folder as the sample and load the index.html

You can load data by drag and drop, or using a pick file dialog.

# Live Demo

The automotive CATIA assembly takes up ~10 GB.
This CAD data was compressed to ~153 MB data set that is rendered using the GPU on the client browser.
