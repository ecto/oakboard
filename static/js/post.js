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
	$.get('/api/!/2', function(post){
		$("#loading").slideUp();
		var post = new EJS({ url: '/templates/post.ejs' }).render(post);
		$(post).hide().prependTo('#feed').slideDown();
		time();
		var r = new Faye.Client('/r');
		r.subscribe('/!/2', function(m) {
			render(m);
		});
	});
 
	$('#shareForm').submit(function(){
		$.post('/!/2', {
			'name': $('#name').val(),
			'text': $('#shareTextBox').val() 
		});
		$('#shareTextBox').val('');
		return false;
	});
 
});
 
function render(c) {
	var comment = new EJS({ url: '/templates/comment.ejs' }).render(c);
	$(comment).hide().appendTo('.post-comments').slideDown();
}
