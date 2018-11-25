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

function getHTMLForSavedItem(id, title, subtitle, url, content, path){

    var html = "";

    html += "<div class='row search-result-item'>";
    html += "<div class='col-12'>";
    html += "<a href='" + url + "'>";
    html += "<h3>" + title + "</h3>";
    html += "<div class='dropdown'>";
    html += "<span>"+subtitle+"</span>&nbsp;<a href='#' class='dropdown-toggle' id='dropdownMenuButton' data-toggle='dropdown'></a>";
    html += "        <div class='dropdown-menu dropdown-menu-right' >";
    html += "             <a class='dropdown-item saved-item' data-id='"+id+"' href='#'>Remover</a>";
    html += "        </div>";
    html += "    </div>";
    html += "</a>";
    html += "<p>" + content + "...</p>";
    html += "</div>";
    html += "</div>";

    return html;
}

function getHTMLForSearchResultItem(id, title, subtitle, url, content, path){

    var json = {
        id: id,
        title: title,
        subtitle: subtitle,
        url: url,
        content: content,
        path: path
    }

    json = JSON.stringify(json);

    var html = "";

    html += "<div class='row search-result-item'>";
    html += "<div class='col-12'>";
    html += "<a href='" + url + "'>";
    html += "<h3>" + title + "</h3>";
    html += "<div class='dropdown'>";
    html += "<span>"+subtitle+"</span>&nbsp;<a href='#' class='dropdown-toggle' id='dropdownMenuButton' data-toggle='dropdown'></a>";
    html += "        <div class='dropdown-menu dropdown-menu-right' >";
    html += "             <a class='dropdown-item search-result-save-item' data-json='"+json+"' href='#'>Salvar</a>";
    html += "           <div class='dropdown-divider'></div>";
    html += "            <a class='dropdown-item search-result-download' href='#' data-path='"+path+"'>Baixar</a>";
    html += "        </div>";
    html += "    </div>";
    html += "</a>";
    html += "<p>" + content + "...</p>";
    html += "</div>";
    html += "</div>";

    return html;
}
