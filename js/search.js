
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

function getHTMLForSearchResultItem(title, subtitle, url, content, path){

    var html = "";

    html += "<div class='row search-result-item'>";
    html += "<div class='col-12'>";
    html += "<a href='" + url + "'>";
    html += "<h3>" + title + "</h3>";
    html += "<div class='dropdown'>";
    html += "<span>"+subtitle+"</span>&nbsp;<a href='#' class='dropdown-toggle' id='dropdownMenuButton' data-toggle='dropdown'></a>";
    html += "        <div class='dropdown-menu dropdown-menu-right' >";
    html += "             <a class='dropdown-item' href='#'>Save</a>";
    html += "           <div class='dropdown-divider'></div>";
    html += "            <a class='dropdown-item search-result-download' href='#' data-path='"+path+"'>Download</a>";
    html += "        </div>";
    html += "    </div>";
    html += "</a>";
    html += "<p>" + content + "...</p>";
    html += "</div>";
    html += "</div>";

    return html;
}

function decodeUrlParameter(str) {
	return decodeURIComponent((str+'').replace(/\+/g, '%20'));
}

function downloadFileAsBase64(filename, text) {

    var element = document.createElement('a');

    element.setAttribute('href', 'data:application/octet-stream;charset=utf-8;base64,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
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
                    var path = item.path;

                    $(".search-result").append(getHTMLForSearchResultItem(title, subtitle, url,content, path))
                });

                if( total > maxPage){

                    var url = "/search.html?query=" + encodeURIComponent($("#question-search").val())

                    for(var i = 1; i <= maxPage; i++){
                        $(".pages ul").append(getHTMLForPages(i, selectedPage, url+"&page="+i));
                    }
                }
            },
            error: function(a,b,c){
                $(".search-errors").html("<p><strong>"+a.status+" "+a.statusText+"</strong></p>"+a.responseJSON.message);
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

    $('body').on('click', '.search-result-download', function() {

       var url = "https://api.github.com/repos/bancodequestoes/linguagem-c/contents/";
       var path = $(this).data("path");

        $.ajax({
            url: url+path,
            type: "GET",
            success: function(file) {
                downloadFileAsBase64(file.name, file.content);
            }
        });
     });
});
