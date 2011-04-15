jQuery.fn.outerHTML = function(s) {
  return (s)
    ? this.before(s).remove()
    : jQuery("&lt;p&gt;").append(this.eq(0).clone()).html();
}

function time(){
  $('.time').each(function(){
    $(this).text(humane($(this).attr('data-time')));
  });
}
        
setInterval(function(){time()}, 2000);

function humane(time){
        var date = new Date(+time),
                diff = (((new Date()).getTime() - date.getTime()) / 1000),
                day_diff = Math.floor(diff / 86400);
        
        if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
                return time;
                
        return day_diff == 0 && (
                        diff < 60 && "just now" ||
                        diff < 120 && "1 minute ago" ||
	                diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
                        diff < 7200 && "1 hour ago" ||
                        diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
                day_diff == 1 && "Yesterday" ||
                day_diff < 7 && day_diff + " days ago" ||
                day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

function setCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function deleteCookie(name) {
    setCookie(name,"",-1);
}

function ss(s) {
    $('link[rel=stylesheet]').attr('href', '/' + s + '.css');
}

RegExp.escape = function(text) {
  if (!arguments.callee.sRE) {
    var specials = [
      '/', '.', '*', '+', '?', '|',
      '(', ')', '[', ']', '{', '}', '\\'
    ];
    arguments.callee.sRE = new RegExp(
      '(\\' + specials.join('|\\') + ')', 'g'
    );
  }
  return text.replace(arguments.callee.sRE, '\\$1');
}

function enableSmiles(el) {
    var el = $(el);
    console.log(':)');
    var smiles = {
        ':))': 'happy.gif',
        ':)': 'smile.gif',
        ':D': 'biggrin.gif',
        ':(': 'sad.png',
        ':unsure:': 'unsure.gif',
        ":'(": 'cry.png',
        '8)': 'cool.png',
        ':awesome:': 'awesome.gif',
        ':bye:': 'bye.gif',
        ':really:': 'rolleyes.gif',
        ':pokerface:': 'hmmm.png'
    };
    for (var i in smiles) {
        var emote = RegExp.escape(i);
        el.html(el.html().replace(new RegExp( emote, 'gi' ), '<img src="/smile/' + smiles[i] + '" />'));
    }
    return el;
}

var style = getCookie('style');
if (style) ss(style);
var smile = getCookie('smile');
if (!smile) {
    setCookie('smile', 'on', 10);
    smile = 'on';
}
smile = smile == 'on' ? true : false;
var memory = getCookie('memory');
