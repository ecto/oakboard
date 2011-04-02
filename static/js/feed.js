$(document).ready(function(){
	// show the right header
	$('.pane').hide();
	$('#userinfo').hide();
	$('#shareText').show();
	$('#shareTextBox').focus(function(){
		$('#userinfo').slideDown();
		$('#feed').animate({'padding-top': '140px'});
		//$('.pane:visible input').slideDown();
	});
 
	// get the posts
	$.get('/api/all', function(posts){
		$("#loading").slideUp();
		for (var i in posts) {
			console.log(posts[i]);
			var post = new EJS({ url: '/templates/post.ejs' }).render(posts[i]);
			$("#feed").append(post);
		}
		$('.post').hide();
		time();
		$('.post').slideDown();
		var r = new Faye.Client('/r');
		r.subscribe('/all', function(m) {
			render(m);
			time();
		});
	});
 
	$('#shareForm').submit(function(){
		$.post('/', {
			'name': $('#name').val(),
			'text': $('#shareTextBox').val() 
		});
		$('#shareTextBox').val('').blur();
		$('#userinfo').slideUp();
		$('#feed').animate({'padding-top': '80px'});
		return false;
	});
 
});
 
 
function render(m) {
  var p = new EJS({ url: '/templates/post.ejs' }).render(m);
  if ($('#feed .post').first().attr('id') == m.id) { 
    $('#' + m.id).outerHTML(p);
  } else {
    $('#' + m.id).slideUp().remove();
    $(p).hide().prependTo('#feed').slideDown();
  }
}
