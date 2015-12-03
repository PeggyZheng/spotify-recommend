var https = require('https');
var http = require('http');
var events = require('events');
var querystring = require('querystring');
var static = require('node-static');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    var options = {
        host: 'api.spotify.com',
        path: '/v1/' + endpoint + '?' + querystring.stringify(args)
    };
    var item = '';
    https.get(options, function(response) {
        response.on('data', function(chunk) {
            item += chunk;
        });

        response.on('end', function() {
            item = JSON.parse(item);
            emitter.emit('end', item);

        });

        response.on('error', function() {
            emitter.emit('error');
        });
    });
    return emitter;
};


var getRelatedArtists = function(id) {
    var emitter1 = new events.EventEmitter();
    var options = {
        host: 'api.spotify.com',
        path: '/v1/artists/' + id + '/related-artists'
    };
    var items = '';
    console.log('this is the path: ' + '/v1/artists/' + id + '/related-artists');
    https.get(options, function(response) {
        //console.log(response, 'this is the response');
        response.on('data', function(chunk) {
            items += chunk;
        });

        response.on('end', function() {
            items = JSON.parse(items);
            emitter1.emit('end', items);
        });

        response.on('error', function() {
            emitter1.emit('error');
        });

    });
    return emitter1;
};

var fileServer = new static.Server('./public');
var server = http.createServer(function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.method == 'GET' && req.url.indexOf('/search/') == 0) {
        var name = req.url.split('/')[2];
        var searchReq = getFromApi('search', {
            q: name,
            limit: 1,
            type: 'artist'
        });


        searchReq.on('end', function(item) {
            var artist = item.artists.items[0];
            var id = artist.id;
            var related = getRelatedArtists(id);
            related.on('end', function(items) {
                console.log(items, 'these are the items ');
                artist.related = items.artists;
                res.end(JSON.stringify(artist));
            });

            related.on('error', function() {
                res.statusCode = 404;
                res.end();
            });


        });

        searchReq.on('error', function() {
            res.statusCode = 404;
            res.end();
        });
    } else {
        fileServer.serve(req, res);
    }

});

server.listen(8080);
console.log('the server has started on port 8080');



























