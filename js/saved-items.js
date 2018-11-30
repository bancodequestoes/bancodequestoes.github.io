
function getTex(files){

    var str = "";

    str += "\\documentclass[a4paper, 12pt, addpoints]{exam} \n";

    str += "\\usepackage{listings} \n";

    str += "\\usepackage[utf8]{inputenc}  \n";
    str += "\\usepackage[T1]{fontenc} \n";
    str += "\\usepackage[brazil]{babel} \n";


    str += "\\pointpoints{ponto}{pontos}\n"

	str += "\\newcommand{\\tf}[1][{}]{% \n"
	str += "  \\fillin[#1][0.25in]% \n"
	str += "} \n"


    str += "\\footer{}{Página \\thepage\ de \\numpages}{} \n";

    str += "\\begin{document} \n";

    str += "    \\begin{questions}\n";

    $.each(files, function(i, file){
        str += "    \\input{"+file+"}\n";
    });

    str += "    \\end{questions}\n";
    str += "\\end{document}\n";

    return str;
}

$(function(){

    var zip = new JSZip();

   var savedItems = getItem("saved-items") || [];

   $.each(savedItems, function(i, item){

        var id = item.id;
        var title = item.title;
        var subtitle = item.subtitle;
        var url = item.url;
        var content = item.content;
        var path = item.path;

        $(".search-result").append(getHTMLForSavedItem(id, title, subtitle, url,content, path))
    });

    $(".search-total").html(savedItems.length + " itens salvos");

    $('body').on('click', '.saved-item', function() {

        var id = $(this).data("id");

        var items = getItem("saved-items") || [];

        items = items.filter(i => i.id !== id);

        saveItem("saved-items", items);

        location.reload();
    });

    $("#clear").click(function(){
        if(confirm("Deseja remover todos os itens salvos?")){
            saveItem("saved-items", []);
            location.reload();
        }
    });

    $("#download-as-zip-file").click(function(){

        var files = [];

        var folders = {};

        $.each(savedItems, function(i, item){



            var url = "https://api.github.com/repos/bancodequestoes/linguagem-c/contents/";
            var path = item.path;
            var folder = path.split("/")[0];
            files.push(path);

            if (!(folder in folders)){
                folders[folder] = zip.folder(folder);
            }

            $.ajax({
                async: false,
                url: url+path,
                type: "GET",
                success: function(file) {
                    folders[folder].file(file.name, file.content, {base64: true});
                }
            });
        });

        zip.file("prova.tex", getTex(files));

        zip.generateAsync({type:"blob"}).then(function (blob) { // 1) generate the zip file
            saveAs(blob, "prova.zip");                          // 2) trigger the download
        }, function (err) {
            alert(err);
        });
    });
});
