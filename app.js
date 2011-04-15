var express    = require('express'),
    formidable = require('formidable'),
    app        = express.createServer(),
    faye       = require('faye'),
    redis      = require('redis'),
    db         = redis.createClient(),
    crypto     = require('crypto'),
    im         = require('imagemagick'),
    knox       = require('knox'),
    exec       = require('child_process').exec;

var s3 = knox.createClient({
    key: 'A',
    secret: 'B',
    bucket: 'C'
});

    app.use(express.cookieDecoder());
    app.use(express.bodyDecoder());
    app.use(express.staticProvider(__dirname + '/static'));
    app.use(express.session({ secret: 'bananas' }));
    app.set('view engine', 'ejs');

///////////////////////////////////////
// MAIN SITE
///////////////////////////////////////

app.get('/', function(req, res){
    res.render('feed');
});

app.post('/', function(req, res){
    if (req.body) newPost(req.body);

    var form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, function(err, fields, files) {
        if (!err) {
            var imageName = crypto.createHash('md5').update(+new Date() + files.image.name).digest("hex");
            fields.image = imageName;
            im.crop({
                srcPath: files.image.path,
                dstPath: '/tmp/' + imageName,
                width: 50,
                height: 50,
                quality: 1
            }, function (err) {
                if (!err) {
                    s3.putFile('/tmp/' + imageName, '/thumbs/' + imageName, function(err, res){
                        if (err) console.log(err);
                    });
                } else { console.log(err); }
            });
            s3.putFile(files.image.path, '/' + imageName, function(err, res){
                if (err) console.log(err);
            });
            newPost(fields);
            res.redirect('/');
        } else {
            console.log(['image upload failed on form parse', err]);
	    res.redirect('/');
        }
    });
});

app.get('/!/:post', function(req, res){
  res.render('post', {
    locals: {
      id: req.params.post
    }
  });
});

app.post('/!/:post', function(req, res){
    if (req.body) newComment(req.params.post, req.body);

    var form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, function(err, fields, files) {
        if (!err) {
            var imageName = crypto.createHash('md5').update(+new Date() + files.image.name).digest("hex");
            fields.image = imageName;
            im.crop({
                srcPath: files.image.path,
                dstPath: '/tmp/' + imageName,
                width: 32,
                height: 32,
                quality: 1
            }, function (err) {
                if (!err) {
                    s3.putFile('/tmp/' + imageName, '/thumbs/' + imageName, function(err, res){
                        if (err) console.log(err);
                        exec('rm /tmp/' + files.image.name);
                    });
                } else { console.log(err); }
            });
            s3.putFile(files.image.path, '/' + imageName, function(err, res){
                if (err) console.log(err);
                exec('rm ' + files.image.path);
            });
            newComment(req.params.post, fields);
            res.redirect('back');
        } else {
            console.log(['image upload failed on form parse', err]);
	    res.redirect('back');
        }
    });
});

///////////////////////////////////////
// API STUFF
///////////////////////////////////////

app.get('/api/!/:post', function(req, res){
  getPost(req.params.post, false, function(p){
    res.send(p);
  });
});

app.get('/api', function(req, res){
    res.render('api');
});

app.get('/api/all', function(req, res){
  db.lrange('all', 0, -1, function(err, posts) {
    var c = 0;
    var all = [];
    posts.forEach(function(id){
      getPost(id, true, function(p){
        c++;
        all[posts.indexOf(p.id)] = p;
        if (c == posts.length) {
          res.send(all);
        }
      });
    });
  });
});

///////////////////////////////////////
// STATIC
///////////////////////////////////////

app.get('/settings', function(req, res){
    res.render('settings');
});

app.get('/about', function(req, res){
    res.render('about');
});

///////////////////////////////////////
// REALTIME
///////////////////////////////////////

var APP_PASSWORD = 'wut';

var ServerAuth = {
  incoming: function(message, callback) {
    if (/^\/meta\//.test(message.channel))
      return callback(message);
    var password = message.ext && message.ext.password;
    if (password !== APP_PASSWORD)
      message.error = Faye.Error.extMismatch();
    if (password) delete message.ext.password;
    callback(message);
  }
};

var ClientAuth = {
  outgoing: function(message, callback) {
    message.ext = message.ext || {};
    message.ext.password = APP_PASSWORD;
    callback(message);
  }
};

var r = new faye.NodeAdapter({
  mount:    '/r',
  timeout:  45
});

////////////////////////////////////////
// HOOKS
////////////////////////////////////////

app.listen(3030);
r.attach(app);
r.addExtension(ServerAuth);
r.getClient().addExtension(ClientAuth);

/////////////////////////////
//  MODEL
/////////////////////////////

function getPost(id, t, ca) {
  t = t || false;
  var cs = t ? -5 : 0;
  var ce = -1;
  db.hgetall('post:' + id, function(e, p){
    p.type = 'post';
    p.comments = [];
    db.lrange('post:' + id + ':comments', cs, ce, function(e, cc){
      if (!cc || cc.length < 1) {
        ca(p);
      } else {
        cc.forEach(function(cid){
          db.hgetall('comment:' + cid, function(e, c){
            p.comments.push(c);
            if (p.comments.length == cc.length) {
              ca(p);
            }
          });
        });
      }
    });
  });
}

function newPost(p) {
    var n = p.name ? p.name : '';
    var t = p.text || '';
    var i = p.image || null;

    var nameSplit = n.replace('!','#').split('#');
    if (nameSplit.length > 1) {
        var name = nameSplit[0].replace(/</g, '&lt;').replace(/>/g, '&gt;') + ' ! ' +
                   crypto.createHash('md5').update(nameSplit[1].replace(/</g, '&lt;').replace(/>/g, '&gt;')).digest("hex").slice(-5, -1);
    } else {
        var name = n.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    var url = /((ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?)/ig;
    db.incr('posts', function(err, id){
        var post = {
            id: id,
            name: name,
            text: t.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(url, "<a href=\"$1\">$1</a>"),
            time: +new Date(),
            cc: 0,
            image: i
        };
        db.hmset('post:' + id, post, function(err, status){
            db.lrem('all', 0, id, function(){
                db.lpush('all', id);
                db.ltrim('all', 0, 50);
            });
        });
	post.type = 'post';
	post.comments = [];
        r.getClient().publish('/all', post);
    });
}

function newComment(pid, c) {
    var n = c.name ? c.name : '';
    var t = c.text || '';
    var i = c.image || null;

  var nameSplit = n.replace('!','#').split('#');
  if (nameSplit.length > 1) {
    var name = nameSplit[0].replace(/</g, '&lt;').replace(/>/g, '&gt;') + ' ! ' + 
                crypto.createHash('md5').update(nameSplit[1].replace(/</g, '&lt;').replace(/>/g, '&gt;')).digest("hex").slice(-5, -1);
  } else { var name = n.replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  db.incr('comments', function(e, id){
    var comment = {
      id: id,
      name: name,
      text: t.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      time: +new Date(),
      image: i
    }
    db.hmset('comment:' + id, comment, function(e, s){
      db.rpush('post:' + pid + ':comments', id);
      db.hincrby('post:' + pid, 'cc', 1);
      db.lrem('all', 0, pid, function(e, s){
        db.lpush('all', pid);
        db.ltrim('all', 0, 50);
	getPost(pid, true, function(p){
	  r.getClient().publish('/!/' + pid, comment);
	  r.getClient().publish('/all', p);
	});
      });
    });
  });
}
