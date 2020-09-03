var resizeFun = function() {
    	  var total = $(window).width(),  
    	      $section = $('section') ,
    	      $left_col  =$('#left-column'), $right_col  =$('#right-column');

    	  var rem = total - $section.outerWidth() - $left_col.outerWidth(true)
		  if (rem < 0){
			  $left_col.css('display', 'none');
			  $right_col.css('display', 'none');
		  } else {
			  $left_col.css('display', 'block');
			  $right_col.css('display', 'block')
			  var dim=(($section.outerWidth(true) - $section.outerWidth())/2)-$left_col.outerWidth(true)-30;
			  $left_col.css('left', dim )
			  $right_col.css('right', dim)
		  }
    	  $("#player").attr('width', total/3 ).attr('height' , total / 5 ) 
		  
    	}

$(window).resize(resizeFun);

$(function() {
   	  $("section h1, section h2, section h3").each(function(){
   	    $("nav ul").append("<li class='tag-" + this.nodeName.toLowerCase() + "'><a href='#" + $(this).text().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g,'') + "'>" + $(this).text() + "</a></li>");
   	    $(this).attr("id",$(this).text().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g,''));
   	    $("nav ul li:first-child a").parent().addClass("active");
   	  });

   	  $("nav ul li").on("click", "a", function(event) {
    	    var position = $($(this).attr("href")).offset().top - $("#main_content_wrap").offset().top;
    	    $("#body_wrapper").animate({scrollTop: position }, 400);
    	    event.preventDefault();
   		});
	  $("#player-container").remove().appendTo("section p:first")
      resizeFun();
      $('img').on('load', resizeFun);
	  setTimeout(()=>{
		$("#loading").addClass("dissolve")
		$("#loading div").addClass("dissolve")
		setTimeout(()=>{
			$("#loading").remove()
	   	}, 1010);
	   }, 2000);
	  

 });