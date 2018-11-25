
var api = "https://api.github.com/search/code";

function highlight(text, highlight) {

    var index = text.indexOf(highlight);

    if (index >= 0) {
        text = text.substring(0,index) + "<span class='highlight'>" + text.substring(index,index+text.length) + "</span>" + text.substring(index + text.length);
    }

    return text;
  }

var getUrlParameter = function getUrlParameter(sParam) {

    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};

function getHTMLForPages(page, selectedPage, url){

    var html = "";

    html += "<li class='list-inline-item'>";

    if(page == selectedPage){
        html += "<a href='"+url+"'><strong>"+page+"</strong></a>";
    }else{
        html += "<a href='"+url+"'>"+page+"</a>";
    }

    html += "</li>";

    return html;
}

function getHTMLForSearchResultItem(title, subtitle, url, content){

    var html = "";

    html += "<div class='row search-result-item'>";
    html += "<div class='col-12'>";
    html += "<a href='" + url + "'>";
    html += "<h3>" + title + "</h3>";
    html += "<span>"+subtitle+"</span>";
    html += "</a>";
    html += "<p>" + content + "...</p>";
    html += "</div>";
    html += "</div>";

    return html;
}

function decodeUrlParameter(str) {
	return decodeURIComponent((str+'').replace(/\+/g, '%20'));
}

$(function(){

    var query = getUrlParameter("query");
    var selectedPage = getUrlParameter("page") || 1;

    if (query !== undefined){

        $("#question-search").val(decodeUrlParameter(query));

        var perPage = 5;

        var repository = "linguagem-c";

        var query = encodeURIComponent(query+" repo:bancodequestoes/"+repository);

        var url = api + "?q=" + query + "&page=" + selectedPage + "&per_page=" + perPage;

        console.log("Sending...");

        $.ajax({
            url: url,
            type: "GET",
            beforeSend: function(xhr){
                xhr.setRequestHeader('Accept', 'application/vnd.github.v3.text-match+json');
            },
            success: function(data) {

                var total = data.total_count;

                $(".search-total").html("Aproximadamente " + total + " resultados");

                console.log("Done. "+total+" found");

                var maxPage = Math.ceil(total/perPage);

                $.each(data.items, function(i, item){

                    var title = item.name;
                    var subtitle = item.path;
                    var url = item.html_url;
                    var content = item.text_matches[0].fragment;

                    $(".search-result").append(getHTMLForSearchResultItem(title, subtitle, url,content))
                });

                if( total > maxPage){

                    var url = "/search.html?query=" + encodeURIComponent($("#question-search").val())

                    for(var i = 1; i <= maxPage; i++){
                        $(".pages ul").append(getHTMLForPages(i, selectedPage, url+"&page="+i));
                    }
                }
            }
        });
    }

    $(".form-question-search").submit(function(){

        var text = $(this).find("#question-search").val().trim() ;

        if (text == ""){

            $("#question-search").focus();

            return false;
        };

        return true;
    });
});
