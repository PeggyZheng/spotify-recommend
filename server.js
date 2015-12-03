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
    var item = '';
    console.log('this is the path: ' + '/v1/artists/' + id + '/related-artists');
    https.get(options, function(response) {
        //console.log(response, 'this is the response');
        response.on('data', function(chunk) {
            item += chunk;
        });

        response.on('end', function() {
            item = JSON.parse(item);
            emitter1.emit('end', item);
        });

        response.on('error', function() {
            emitter1.emit('error');
        });

    });
    return emitter1;
};

var getTracks = function(artist, args, callback) {
    var id = artist.id;
    var options = {
        host: 'api.spotify.com',
        path: '/v1/artists/' + id + '/top-tracks' + '?' + querystring.stringify(args)
    };
    var item = '';
    https.get(options, function(response) {
        response.on('data', function(chunk) {
            item += chunk;
        });

        response.on('end', function() {
            item = JSON.parse(item);
            callback(null, item);
        });

        response.on('error', function(err) {
            callback(err);
        });
    });

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


        searchReq.on('end', function (item) {
            var artist = item.artists.items[0];
            var id = artist.id;
            var related = getRelatedArtists(id);
            related.on('end', function (item) {
                artist.related = item.artists;

                var complete = 0;
                var checkComplete = function() {
                    if (complete === artist.related.length) {
                        res.end(JSON.stringify(artist));
                    }
                };

                artist.related.forEach(function (artistRelated) {
                    getTracks(artistRelated, {country: 'US'}, function (err, item) {
                        if (err) {
                            console.error(err);
                        } else {
                            artistRelated.tracks = item.tracks;

                        }
                        complete += 1;
                        checkComplete();
                    })
                });

                related.on('error', function () {
                    res.statusCode = 404;
                    res.end();
                });


                searchReq.on('error', function () {
                    res.statusCode = 404;
                    res.end();
                });
            });
        });
    } else {
        fileServer.serve(req, res);
    }

});

server.listen(8080);
console.log('the server has started on port 8080');



























