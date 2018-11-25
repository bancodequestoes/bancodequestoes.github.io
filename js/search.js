
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

                    var id = item.sha;
                    var title = item.name;
                    var subtitle = item.path;
                    var url = item.html_url;
                    var content = item.text_matches[0].fragment;
                    var path = item.path;

                    $(".search-result").append(getHTMLForSearchResultItem(id, title, subtitle, url,content, path))
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

     $('body').on('click', '.search-result-save-item', function() {

        var item = $(this).data("json");

        var items = getItem("saved-items") || [];

        if (items.some(i => i.id === item.id)) {
            $.snackbar({content: "Arquivo já salvo!", timeout: 2000});
        }else{
            items.push(item);
            $.snackbar({content: "Item salvo!", timeout: 2000});
        }

        saveItem("saved-items", items);
      });

});
