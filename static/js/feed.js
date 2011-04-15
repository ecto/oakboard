$(document).ready(function(){
	// show the right header
	$('.pane').hide();
	$('#userinfo').hide();
	$('#shareText').show();
	$('#shareTextBox').focus(function(){
		$('#userinfo').slideDown();
		$('#feed').animate({'padding-top': '120px'});
		//$('.pane:visible input').slideDown();
	});
 
	var r;
	// get the posts
	$.get('/api/all', function(posts){
		$("#loading").slideUp();
		for (var i in posts) {
			var post = new EJS({ url: '/templates/post.ejs' }).render(posts[i]);
			$("#feed").append(smile ? enableSmiles(post) : post);
		}
		$('.post').hide();
		time();
		$('.post').slideDown();
		r = new Faye.Client('/r');
		r.subscribe('/all', function(m) {
			render(m);
			time();
		});
	});

	$('#channels li a').click(function(){
		$('.post').animate({'opacity': '.1'}, 300, 'swing');
		$('.current').removeClass('current');
		$(this).parent().attr('class', 'current');
		// get the posts
		$.get('/api/all', function(posts){
			$('.post').remove();
			for (var i in posts) {
				var post = new EJS({ url: '/templates/post.ejs' }).render(posts[i]);
				$("#feed").append(smile ? enableSmiles(post) : post);
			}
			time();
			$('html, body').animate({ scrollTop: 0 }, 300, 'swing');
			r.subscribe('/all', function(m) {
				render(m);
				time();
			});
		});
		return false;
	});

	$('#shareForm').submit(function(){
		if ($('#image').val()) return true;
		$.post('/', {
			'name': $('#name').val(),
			'text': $('#shareTextBox').val(),
		});
		$('#shareTextBox').val('').blur();
		$('#userinfo').slideUp();
		$('#feed').animate({'padding-top': '60px'});
		return false;
	});
});

function render(m) {
  var p = new EJS({ url: '/templates/post.ejs' }).render(m);
  if ($('#feed .post').first().attr('id') == m.id) { 
    $('#' + m.id).outerHTML(smile ? enableSmiles(p) : p);
  } else {
    $('#' + m.id).slideUp().remove();
    $(smile ? enableSmiles(p) : p).hide().prependTo('#feed').slideDown();
  }
}
